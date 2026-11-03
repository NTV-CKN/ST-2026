import { expect, test, type Page } from '@playwright/test';
import mysql from 'mysql2/promise';
import type { Connection, RowDataPacket } from 'mysql2/promise';

interface UserRecord extends RowDataPacket {
    id: number;
    user_name: string;
    email: string;
    full_name: string;
    role_id: number;
    status: string;
    avatar: string | null;
    password: string | null;
    uid: string | null;
}

let listPagePassed = false;
let addPopupPassed = false;
let editPopupPassed = false;
let editUserSucceeded = false;
let lockButtonsPassed = false;
let userLocked = false;
let deletedUserSucceeded = false;
let addedUserName: string | undefined;
let addedUserEmail: string | undefined;
let editOriginal: UserRecord | undefined;
let editChanged = false;
let lockOriginalStatus: string | undefined;
let lockUserId: number | undefined;

function requiredEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        test.skip(true, `Blocked: configure ${name} in Playwright/.env.`);
        return '';
    }
    return value;
}

function envOr(name: string, fallback: string): string {
    return process.env[name]?.trim() || fallback;
}

function requirePassed(passed: boolean, caseId: string): void {
    if (!passed) {
        test.skip(true, `Blocked: prerequisite ${caseId} did not pass.`);
    }
}

function requireDestructiveDbPermission(): void {
    const allowed = process.env.ALLOW_DESTRUCTIVE_DB === 'true';
    const database = process.env.DB_NAME;
    test.skip(
        !allowed || database !== 'phu_kien_cong_nghe',
        `Blocked: this test changes database data and requires ALLOW_DESTRUCTIVE_DB=true with DB_NAME=phu_kien_cong_nghe (current DB_NAME=${database ?? 'unset'}).`,
    );
}

function dbConfig() {
    const port = Number(requiredEnv('DB_PORT'));
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('DB_PORT must be an integer between 1 and 65535.');
    }
    return {
        host: requiredEnv('DB_HOST'),
        port,
        user: requiredEnv('DB_USER'),
        password: requiredEnv('DB_PASSWORD'),
        database: requiredEnv('DB_NAME'),
    };
}

async function withDb<T>(action: (connection: Connection) => Promise<T>): Promise<T> {
    const connection = await mysql.createConnection(dbConfig());
    try {
        return await action(connection);
    } finally {
        await connection.end();
    }
}

async function readUser(id: number): Promise<UserRecord | undefined> {
    return withDb(async (connection) => {
        const [rows] = await connection.execute<UserRecord[]>(
            `SELECT id, user_name, email, full_name, role_id, status, avatar, password, uid
       FROM users WHERE id = ?`,
            [id],
        );
        return rows[0];
    });
}

async function readUserByName(username: string): Promise<UserRecord | undefined> {
    return withDb(async (connection) => {
        const [rows] = await connection.execute<UserRecord[]>(
            `SELECT id, user_name, email, full_name, role_id, status, avatar, password, uid
       FROM users WHERE user_name = ?`,
            [username],
        );
        return rows[0];
    });
}

async function loginAdmin(page: Page): Promise<void> {
    await page.goto('view-user');
    if (/\/login(?:[?#]|$)/.test(page.url())) {
        await page.locator('input[name="loginInfo"]').fill(requiredEnv('ADMIN_EMAIL'));
        await page.locator('input[name="password"]').fill(requiredEnv('ADMIN_PASSWORD'));
        await page.locator('form.login input[type="submit"]').click();
        await expect(page).toHaveURL(/\/admin-order(?:[?#]|$)/);
        await page.goto('view-user');
    }
    await expect(page).toHaveURL(/\/view-user(?:[?#]|$)/);
    await expect(page.getByRole('heading', { name: 'Quản lý người dùng' })).toBeVisible();
}

async function openAddUser(page: Page): Promise<void> {
    await page.locator('.edit-user-add-user').click();
    await expect(page.locator('#popup-user')).toBeVisible();
}

async function fillValidAddUser(
    page: Page,
    username: string,
    email = `${username}@example.invalid`,
): Promise<void> {
    await page.locator('#user-fullname').fill('Playwright Admin User');
    await page.locator('#user-username').fill(username);
    await page.locator('#user-email').fill(email);
    await page.locator('#user-password').fill('Admin@123');
    await page.locator('#user-repassword').fill('Admin@123');
}

function userRow(page: Page, username: string) {
    return page.locator('tbody tr').filter({
        has: page.locator('td:nth-child(5)').getByText(username, { exact: true }),
    });
}

async function openEditUser(page: Page, id: string): Promise<void> {
    await page.locator(`.edit-user-update[data-id="${id}"]`).click();
    await expect(page.locator('#popup-update-user')).toBeVisible();
    await expect(page.locator('#editUserForm')).toBeVisible();
}

async function captureDialog(page: Page, action: () => Promise<void>): Promise<string> {
    let message = '';
    page.once('dialog', async (dialog) => {
        message = dialog.message();
        await dialog.accept();
    });
    await action();
    return message;
}

async function cleanupAddedUser(): Promise<void> {
    if (!addedUserName || !addedUserEmail) return;
    await withDb(async (connection) => {
        await connection.execute(
            'DELETE FROM users WHERE user_name = ? AND email = ? AND uid IS NULL',
            [addedUserName, addedUserEmail],
        );
    });
    addedUserName = undefined;
    addedUserEmail = undefined;
}

async function restoreEditedUser(): Promise<void> {
    if (!editOriginal || !editChanged) return;
    await withDb(async (connection) => {
        await connection.execute(
            'UPDATE users SET full_name = ?, role_id = ?, avatar = ? WHERE id = ?',
            [editOriginal.full_name, editOriginal.role_id, editOriginal.avatar, editOriginal.id],
        );
    });
    editChanged = false;
}

async function restoreLockedUser(): Promise<void> {
    if (lockUserId === undefined || lockOriginalStatus === undefined) return;
    await withDb(async (connection) => {
        await connection.execute('UPDATE users SET status = ? WHERE id = ?', [
            lockOriginalStatus,
            lockUserId,
        ]);
    });
    lockUserId = undefined;
    lockOriginalStatus = undefined;
}

test.describe('USER_MGT - Admin user management', () => {
    test.describe('List users and search dependency', () => {
        test.describe.configure({ mode: 'serial' });

        test('USER_MGT_List-1: Hiển thị trang và danh sách người dùng', async ({ page }) => {
            await loginAdmin(page);

            const headers = (await page.locator('thead th').allTextContents()).map((header) => header.trim());
            expect(headers).toEqual(
                expect.arrayContaining([
                    'Avatar',
                    'Tên người dùng',
                    'User Name',
                    'Email',
                    'Vai trò',
                    'Trạng thái',
                    'Thao tác',
                ]),
            );
            await expect(page.locator('tbody tr').first()).toBeVisible();
            listPagePassed = true;
        });

        test('USER_MGT_List-2: Tìm kiếm user theo Username hoặc Email', async ({ page }) => {
            requirePassed(listPagePassed, 'USER_MGT_List-1');
            const searchTerm = envOr('PW_ADMIN_USER_SEARCH_TERM', 'admin@gmail.com');
            await loginAdmin(page);

            await page.locator('input[name="searchName"]').fill(searchTerm);
            await page.locator('form[action="search-user"] button[type="submit"]').click();
            await expect(page).toHaveURL(new RegExp(`/search-user\\?searchName=${encodeURIComponent(searchTerm)}`));
            await expect(page.locator('tbody tr')).not.toHaveCount(0);
            await expect(page.locator('tbody')).toContainText(searchTerm);
        });
    });

    test.describe('Add user dialog and validation', () => {
        test.describe.configure({ mode: 'serial' });

        test('USER_MGT_Add-1: Mở pop-up thêm user với các trường rỗng', async ({ page }) => {
            requirePassed(listPagePassed, 'USER_MGT_List-1');
            await loginAdmin(page);
            await openAddUser(page);

            await expect(page.getByRole('heading', { name: 'Thêm User mới' })).toBeVisible();
            for (const selector of [
                '#user-fullname',
                '#user-username',
                '#user-email',
                '#user-password',
                '#user-repassword',
            ]) {
                await expect(page.locator(selector)).toHaveValue('');
            }
            await expect(page.locator('#addUserImagePreview')).toBeEmpty();
            await expect(page.locator('#addUserImage')).toHaveValue('');
            addPopupPassed = true;
        });

        test('USER_MGT_Add-2: Chặn gửi form khi các trường bắt buộc để trống', async ({ page }) => {
            requirePassed(addPopupPassed, 'USER_MGT_Add-1');
            await loginAdmin(page);
            await openAddUser(page);
            let addRequestSent = false;
            page.on('request', (request) => {
                if (request.url().includes('/add-user')) addRequestSent = true;
            });

            const message = await captureDialog(page, () => page.locator('#submitAddUser').click());

            expect(message).toContain('Tên người dùng không được để trống!');
            expect(message).toContain('Username không được để trống!');
            expect(message).toContain('Email không được để trống!');
            expect(message).toContain('Mật khẩu không được để trống!');
            expect(message).toContain('Vui lòng nhập lại mật khẩu!');
            expect(addRequestSent).toBe(false);
        });

        test('USER_MGT_Add-3: Kiểm tra định dạng và độ dài Username', async ({ page }) => {
            requirePassed(addPopupPassed, 'USER_MGT_Add-1');
            await loginAdmin(page);
            await openAddUser(page);
            const usernameCases = [
                {
                    value: `user${'1'.repeat(31)}`,
                    expected: 'Username không được vượt quá 30 ký tự!',
                },
                {
                    value: '123456',
                    expected: 'Username chỉ gồm chữ và số, và phải chứa ít nhất một chữ cái!',
                },
                {
                    value: 'user_name!',
                    expected: 'Username chỉ gồm chữ và số, và phải chứa ít nhất một chữ cái!',
                },
            ];

            for (const usernameCase of usernameCases) {
                await fillValidAddUser(page, usernameCase.value);
                const message = await captureDialog(page, () => page.locator('#submitAddUser').click());
                expect(message).toContain(usernameCase.expected);
            }
        });

        test('USER_MGT_Add-4: Kiểm tra chính sách độ mạnh mật khẩu', async ({ page }) => {
            requirePassed(addPopupPassed, 'USER_MGT_Add-1');
            await loginAdmin(page);
            await openAddUser(page);
            const invalidPasswords = ['short', 'lowercase1!', 'AdminOnly!', 'Admin1234', 'Admin12345678901!'];

            for (const password of invalidPasswords) {
                await fillValidAddUser(page, `valid${Date.now()}`);
                await page.locator('#user-password').fill(password);
                await page.locator('#user-repassword').fill(password);
                const message = await captureDialog(page, () => page.locator('#submitAddUser').click());
                expect(message).toContain('Mật khẩu phải từ 8-16 ký tự');
            }
        });

        test('USER_MGT_Add-5: Báo lỗi khi xác nhận mật khẩu không khớp', async ({ page }) => {
            requirePassed(addPopupPassed, 'USER_MGT_Add-1');
            await loginAdmin(page);
            await openAddUser(page);
            await fillValidAddUser(page, `mismatch${Date.now()}`);
            await page.locator('#user-repassword').fill('Admin@1234');

            const message = await captureDialog(page, () => page.locator('#submitAddUser').click());

            expect(message).toContain('Mật khẩu xác nhận không khớp!');
        });

        test('USER_MGT_Add-6: Phát hiện Username hoặc Email đã tồn tại', async ({ page }) => {
            requirePassed(addPopupPassed, 'USER_MGT_Add-1');
            await loginAdmin(page);
            await openAddUser(page);
            await fillValidAddUser(
                page,
                `unique${Date.now()}`,
                envOr('PW_ADMIN_USER_DUPLICATE_EMAIL', 'admin@gmail.com'),
            );
            const checkRequest = page.waitForRequest((request) =>
                request.url().includes('/check-username-email'),
            );
            const dialogMessage = captureDialog(page, () => page.locator('#submitAddUser').click());

            await checkRequest;
            expect(await dialogMessage).toContain('email đã tồn tại');
        });

        test('USER_MGT_Add-7: Thêm user mới không Avatar với trạng thái Active', async ({ page }) => {
            requireDestructiveDbPermission();
            requirePassed(addPopupPassed, 'USER_MGT_Add-1');
            await loginAdmin(page);
            await openAddUser(page);
            const username = `pwadmin${Date.now()}`;
            const email = `${username}@example.invalid`;
            addedUserName = username;
            addedUserEmail = email;

            try {
                await fillValidAddUser(page, username, email);
                await page.locator('#user-role').selectOption('2');
                const responsePromise = page.waitForResponse(
                    (response) => response.url().includes('/add-user') && response.request().method() === 'POST',
                );
                const dialogMessage = captureDialog(page, () => page.locator('#submitAddUser').click());
                const response = await responsePromise;
                const result = await response.json();

                expect(result.success).toBe(true);
                expect(dialogMessage).toBe('Thêm user thành công');
                const createdUser = await readUserByName(username);
                expect(createdUser).toMatchObject({
                    user_name: username,
                    email,
                    role_id: 2,
                    status: 'active',
                    avatar: null,
                    uid: null,
                });
            } finally {
                await cleanupAddedUser();
            }
        });
    });

    test('USER_MGT_Add-8: Chặn POST /add-user khi không có Session Admin', async ({ request }) => {
        requireDestructiveDbPermission();
        const username = `unauth${Date.now()}`;
        const email = `${username}@example.invalid`;
        try {
            const response = await request.post('add-user', {
                multipart: {
                    name: 'Unauthorized Playwright User',
                    userName: username,
                    email,
                    password: 'Admin@123',
                    role: '2',
                },
            });
            expect([401, 403]).toContain(response.status());
        } finally {
            await withDb(async (connection) => {
                await connection.execute(
                    'DELETE FROM users WHERE user_name = ? AND email = ? AND uid IS NULL',
                    [username, email],
                );
            });
        }
    });

    test.describe('Edit user dialog and data integrity', () => {
        test.describe.configure({ mode: 'serial' });

        test.afterAll(async () => {
            await restoreEditedUser();
        });

        test('USER_MGT_Edit-1: Mở pop-up sửa và hiển thị thông tin hiện tại', async ({ page }) => {
            requirePassed(listPagePassed, 'USER_MGT_List-1');
            await loginAdmin(page);
            const id = envOr('PW_ADMIN_USER_EDIT_ID', '105');
            const record = await readUser(Number(id));
            expect(record, `Expected fixture user ID ${id} from USER_MGT_Edit-1`).toBeDefined();
            await openEditUser(page, id);

            await expect(page.locator('#edit-user-id')).toHaveValue(id);
            await expect(page.locator('#name-user')).toHaveValue(record!.full_name);
            await expect(page.locator('#user-name')).toHaveValue(record!.user_name);
            await expect(page.locator('#email-edit')).toHaveValue(record!.email);
            await expect(page.locator('#role-edit')).toHaveValue(String(record!.role_id));
            await expect(page.locator('#editUserForm img')).toBeVisible();
            editPopupPassed = true;
        });

        test('USER_MGT_Edit-2: Username và Email chỉ đọc', async ({ page }) => {
            requirePassed(editPopupPassed, 'USER_MGT_Edit-1');
            await loginAdmin(page);
            await openEditUser(page, envOr('PW_ADMIN_USER_EDIT_ID', '105'));

            await expect(page.locator('#user-name')).toHaveAttribute('readonly', '');
            await expect(page.locator('#email-edit')).toHaveAttribute('readonly', '');
        });

        test('USER_MGT_Edit-3: Không lưu khi Họ tên để trống', async ({ page }) => {
            requirePassed(editPopupPassed, 'USER_MGT_Edit-1');
            await loginAdmin(page);
            await openEditUser(page, envOr('PW_ADMIN_USER_EDIT_ID', '105'));
            await page.locator('#name-user').fill('');
            let editRequestSent = false;
            page.on('request', (request) => {
                if (request.url().includes('/edit-user')) editRequestSent = true;
            });

            const message = await captureDialog(page, () => page.locator('#submitEditUser').click());

            expect(message).toBe('Họ tên không được để trống.');
            expect(editRequestSent).toBe(false);
        });

        test('USER_MGT_Edit-4: Cập nhật Họ tên và Role, giữ nguyên Avatar', async ({ page }) => {
            requireDestructiveDbPermission();
            requirePassed(editPopupPassed, 'USER_MGT_Edit-1');
            await loginAdmin(page);
            const id = Number(envOr('PW_ADMIN_USER_EDIT_ID', '105'));
            editOriginal = await readUser(id);
            expect(editOriginal, `Expected fixture user ID ${id}`).toBeDefined();
            await openEditUser(page, String(id));
            const updatedName = 'Nguyễn Văn A (Updated)';
            const originalRole = editOriginal!.role_id;
            const updatedRole = originalRole === 2 ? '1' : '2';
            await page.locator('#name-user').fill(updatedName);
            await page.locator('#role-edit').selectOption(updatedRole);
            const originalAvatar = await page.locator('#editUserForm img').getAttribute('src');

            const dialogMessages: string[] = [];
            page.on('dialog', async (dialog) => {
                dialogMessages.push(dialog.message());
                await dialog.accept();
            });
            const successDialog = page.waitForEvent('dialog', {
                predicate: (dialog) => dialog.message() === 'Cập nhật người dùng thành công',
            });
            const responsePromise = page.waitForResponse(
                (response) => response.url().includes('/edit-user') && response.request().method() === 'POST',
            );
            await page.locator('#submitEditUser').click();
            editChanged = true;
            const response = await responsePromise;
            const result = await response.json();
            await successDialog;

            expect(result.success).toBe(true);
            expect(dialogMessages).toContain('Bạn có chắc chắn muốn cập nhật dữ liệu của người dùng này?');
            expect(dialogMessages).toContain('Cập nhật người dùng thành công');
            const updatedUser = await readUser(id);
            expect(updatedUser).toMatchObject({
                full_name: updatedName,
                role_id: Number(updatedRole),
                avatar: editOriginal!.avatar,
            });
            expect(originalAvatar).toBe(editOriginal!.avatar ?? '');
            editUserSucceeded = true;
        });

        test('USER_MGT_Edit-6: Username, Email và Password không bị ghi đè', async () => {
            requirePassed(editUserSucceeded, 'USER_MGT_Edit-4');
            expect(editOriginal).toBeDefined();
            const current = await readUser(editOriginal!.id);

            expect(current?.user_name).toBe(editOriginal!.user_name);
            expect(current?.email).toBe(editOriginal!.email);
            expect(current?.password).toBe(editOriginal!.password);
        });

    });

    test('USER_MGT_Edit-7: Bỏ qua Username, Email và Password không nằm trong payload cho phép sửa', async ({
                                                                                                                page,
                                                                                                            }) => {
        await loginAdmin(page);
        const id = Number(envOr('PW_ADMIN_USER_EDIT_ID', '105'));
        const before = await readUser(id);
        expect(before).toBeDefined();
        const response = await page.request.post('edit-user', {
            multipart: {
                userId: String(id),
                role: String(before!.role_id),
                name: before!.full_name,
                userName: `tampered${Date.now()}`,
                email: `tampered${Date.now()}@example.invalid`,
                password: 'Tampered@123',
            },
        });
        const result = await response.json();
        const after = await readUser(id);

        expect(result.success).toBe(true);
        expect(after?.user_name).toBe(before!.user_name);
        expect(after?.email).toBe(before!.email);
        expect(after?.password).toBe(before!.password);
    });

    test.describe('Lock and unlock Customer dependencies', () => {
        test.describe('Lock/unlock lifecycle', () => {
            test.describe.configure({ mode: 'serial' });

            test.afterAll(async () => {
                await restoreLockedUser();
            });

            test('USER_MGT_Lock-1: Nút Khóa/Mở khóa khớp trạng thái Customer', async ({ page }) => {
                requirePassed(listPagePassed, 'USER_MGT_List-1');
                await loginAdmin(page);

                const activeUsers = page.locator('tbody tr').filter({ hasText: 'Đang hoạt động' });
                const lockedUsers = page.locator('tbody tr').filter({ hasText: 'Đang bị khóa' });
                await expect(activeUsers.first()).toBeVisible();
                await expect(lockedUsers.first()).toBeVisible();
                await expect(activeUsers.first().locator('.edit-user-lock')).toBeVisible();
                await expect(lockedUsers.first().locator('.edit-user-unlock')).toBeVisible();
                lockButtonsPassed = true;
            });

            test('USER_MGT_Lock-2: Khóa tài khoản Customer', async ({ page }) => {
                requireDestructiveDbPermission();
                requirePassed(lockButtonsPassed, 'USER_MGT_Lock-1');
                const username = envOr('PW_ADMIN_USER_LOCK_USERNAME', 'cust01');
                const user = await readUserByName(username);
                expect(user, `Expected fixture Customer ${username}`).toBeDefined();
                expect(user!.role_id).toBe(2);
                lockUserId = user!.id;
                lockOriginalStatus = user!.status;

                await loginAdmin(page);
                const row = userRow(page, username);
                await expect(row.locator('.edit-user-lock')).toBeVisible();
                const message = await captureDialog(page, () => row.locator('.edit-user-lock').click());
                expect(message).toBe('Đồng ý khóa người dùng này?');

                const updated = await readUser(user!.id);
                expect(updated?.status).toBe('locked');
                await expect(userRow(page, username)).toContainText('Đang bị khóa');
                await expect(userRow(page, username).locator('.edit-user-unlock')).toBeVisible();
                userLocked = true;
            });

            test('USER_MGT_Lock-3: Mở khóa tài khoản Customer', async ({ page }) => {
                requireDestructiveDbPermission();
                requirePassed(userLocked, 'USER_MGT_Lock-2');
                const username = envOr('PW_ADMIN_USER_LOCK_USERNAME', 'cust01');
                const user = await readUserByName(username);
                expect(user?.status).toBe('locked');

                await loginAdmin(page);
                const row = userRow(page, username);
                await expect(row.locator('.edit-user-unlock')).toBeVisible();
                const message = await captureDialog(page, () => row.locator('.edit-user-unlock').click());
                expect(message).toBe('Đồng ý mở khóa người dùng này?');

                const updated = await readUser(user!.id);
                expect(updated?.status).toBe('active');
                await expect(userRow(page, username)).toContainText('Đang hoạt động');
                await expect(userRow(page, username).locator('.edit-user-lock')).toBeVisible();
            });
        });

        test('USER_MGT_Lock-4: Không đăng nhập được bằng Customer đang bị khóa', async ({ page, browser }) => {
            requireDestructiveDbPermission();
            requirePassed(lockButtonsPassed, 'USER_MGT_Lock-1');
            const username = envOr('PW_ADMIN_USER_LOCK_USERNAME', 'cust01');
            const user = await readUserByName(username);
            expect(user).toBeDefined();
            expect(user!.role_id).toBe(2);
            const originalStatus = user!.status;

            const adminContext = await browser.newContext();
            const adminPage = await adminContext.newPage();
            try {
                await loginAdmin(adminPage);
                await adminPage.goto(`lock-unlock-user?action=lock&id=${user!.id}`);
                await page.goto('login');
                await page.locator('input[name="loginInfo"]').fill(requiredEnv('PW_ADMIN_USER_LOCK_EMAIL'));
                await page.locator('input[name="password"]').fill(requiredEnv('PW_ADMIN_USER_LOCK_PASSWORD'));
                await page.locator('form.login input[type="submit"]').click();

                await expect(page.locator('.alert-error')).toHaveText(
                    'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin để biết thêm chi tiết.',
                );
            } finally {
                try {
                    const restoreAction = originalStatus === 'locked' ? 'lock' : 'unlock';
                    await adminPage.goto(`lock-unlock-user?action=${restoreAction}&id=${user!.id}`);
                } finally {
                    await adminContext.close();
                }
            }
        });

        test('USER_MGT_Lock-5: Không cho Admin tự khóa tài khoản', async ({ page }) => {
            requirePassed(listPagePassed, 'USER_MGT_List-1');
            await loginAdmin(page);
            const adminId = Number(envOr('PW_ADMIN_USER_SELF_ID', '1'));
            const before = await readUser(adminId);
            expect(before?.role_id).toBe(1);

            await page.goto(`lock-unlock-user?action=lock&id=${adminId}`);

            const after = await readUser(adminId);
            expect(after?.status).toBe(before!.status);
            await expect(page.locator('body')).toContainText('Không thể tự khóa tài khoản của chính mình.');
        });

        test('USER_MGT_Lock-6: Không thay đổi trạng thái tài khoản đích không phải Customer', async ({ page }) => {
            requirePassed(listPagePassed, 'USER_MGT_List-1');
            await loginAdmin(page);
            const adminId = Number(envOr('PW_ADMIN_USER_OTHER_ADMIN_ID', '2'));
            const before = await readUser(adminId);
            expect(before?.role_id).toBe(1);

            await page.goto(`lock-unlock-user?action=lock&id=${adminId}`);

            const after = await readUser(adminId);
            expect(after?.status).toBe(before!.status);
        });
    });

    test.describe('Delete user visibility and guarded cases', () => {
        test.describe.configure({ mode: 'serial' });

        test('USER_MGT_Delete-1: Nút Xóa chỉ hiển thị cho Customer', async ({ page }) => {
            requirePassed(listPagePassed, 'USER_MGT_List-1');
            await loginAdmin(page);
            const rows = page.locator('tbody tr');

            for (let index = 0; index < await rows.count(); index += 1) {
                const row = rows.nth(index);
                const role = (await row.locator('td').nth(0).innerText()).trim();
                const deleteButton = row.locator('.edit-user-remove');
                if (role === 'Customer') {
                    await expect(deleteButton).toBeVisible();
                } else {
                    await expect(deleteButton).toHaveCount(0);
                }
            }
            deletedUserSucceeded = true;
        });

        test('USER_MGT_Delete-2: Xóa Customer không có Avatar', async ({ page }) => {
            requireDestructiveDbPermission();
            requirePassed(deletedUserSucceeded, 'USER_MGT_Delete-1');
            const username = envOr('PW_ADMIN_USER_DELETE_USERNAME', 'cust02');
            const target = await readUserByName(username);
            expect(target, `Expected disposable Customer ${username}`).toBeDefined();
            expect(target!.role_id).toBe(2);
            expect(target!.avatar).toBeNull();

            await loginAdmin(page);
            const row = userRow(page, username);
            await expect(row.locator('.edit-user-remove')).toBeVisible();

            let confirmMessage = '';
            page.once('dialog', async (dialog) => {
                confirmMessage = dialog.message();
                await dialog.accept();
            });
            const responsePromise = page.waitForResponse(
                (response) => response.url().includes('/delete-user') && response.request().method() === 'POST',
            );
            await row.locator('.edit-user-remove').click();
            const response = await responsePromise;
            const result = await response.json();
            expect(confirmMessage).toBe('Bạn có chắc muốn xóa người dùng này không?');
            expect(result.success).toBe(true);
            expect(await readUser(target!.id)).toBeUndefined();
        });

        test('USER_MGT_Delete-3: Chặn xóa tài khoản Admin qua API', async () => {
            test.skip(
                true,
                'Blocked by user choice: the current /delete-user handler can delete an Admin account if this request is accepted.',
            );
        });

        test('USER_MGT_Delete-4: Chặn Customer gọi API xóa user khác', async () => {
            test.skip(
                true,
                'Blocked by user choice: the current /delete-user handler can delete the target Customer if this request is accepted.',
            );
        });
    });
});
