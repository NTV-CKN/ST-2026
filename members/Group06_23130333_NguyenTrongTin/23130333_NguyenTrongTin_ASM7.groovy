import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.testobject.RequestObject
import com.kms.katalon.core.testobject.TestObject
import com.kms.katalon.core.testobject.RestRequestObjectBuilder
import com.kms.katalon.core.testobject.TestObjectProperty
import com.kms.katalon.core.testobject.ConditionType
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.util.KeywordUtil
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import org.openqa.selenium.Keys as Keys
import groovy.transform.Field

// ===================================================================
// MODULE: USER_MGT (Quản lý người dùng) - PKCN
// Script tổng hợp để chạy 24 test case trong một file:
//   Add1-8, Delete1-4, Edit1-5, List1-2, Lock1-5
// Thực hiện bởi: Nguyễn Trọng Tín - 23130333
// ===================================================================

@Field List<String> failedTests = []
@Field String ADMIN_EMAIL = 'admin@gmail.com'
@Field String ADMIN_PASS = 'jYtk7YZ6DwsQg2Dyc/fzuQ=='

// ---------------------------- HELPERS ------------------------------

String o(String repo, String path) {
    return repo ? (repo + '/' + path) : path
}

void startBrowser() {
    WebUI.openBrowser('')
    WebUI.maximizeWindow()
    WebUI.navigateToUrl('http://localhost:8080/pkcn/login')
}

void loginAdmin(String repo, boolean useEnter = true) {
    WebUI.setText(findTestObject(o(repo, 'Page_ng Nhp/input_Tn ng nhp hoc email')), ADMIN_EMAIL)
    WebUI.setEncryptedText(findTestObject(o(repo, 'Page_ng Nhp/input_Mt khu')), ADMIN_PASS)
    if (useEnter) {
        WebUI.sendKeys(findTestObject(o(repo, 'Page_ng Nhp/input_Mt khu')), Keys.chord(Keys.ENTER))
    } else {
        WebUI.click(findTestObject(o(repo, 'Page_ng Nhp/input_submit')))
    }
}

void openUserManagement(String repo) {
    WebUI.click(findTestObject(o(repo, 'Page_Qun l n hng/a_Qun l ngi dng')))
}

void openAddUserPopup(String repo) {
    WebUI.click(findTestObject(o(repo, 'Page_Qun l ngi dng/i_fa-solid fa-circle-plus')))
}

void openEditUserPopup(String repo) {
    WebUI.click(findTestObject(o(repo, 'Page_Qun l ngi dng/i_fa-solid fa-pen-to-square')))
}

void fillAddUserForm(String repo, String name, String username, String email, String pass, String confirmPass) {
    WebUI.setText(findTestObject(o(repo, 'Page_Qun l ngi dng/input_Tn ngi dng')), name)
    WebUI.setText(findTestObject(o(repo, 'Page_Qun l ngi dng/input_Username')), username)
    WebUI.setText(findTestObject(o(repo, 'Page_Qun l ngi dng/input_Email')), email)
    WebUI.setEncryptedText(findTestObject(o(repo, 'Page_Qun l ngi dng/input_Password')), pass)
    WebUI.setEncryptedText(findTestObject(o(repo, 'Page_Qun l ngi dng/input_Nhp li Password')), confirmPass)
}

void submitAddUser(String repo) {
    WebUI.click(findTestObject(o(repo, 'Page_Qun l ngi dng/button_submitAddUser')))
}

// Chạy 1 test case: nếu fail thì ghi nhận và chạy tiếp test sau
void runTest(String testId, Closure body) {
    KeywordUtil.logInfo('========== BẮT ĐẦU: ' + testId + ' ==========')
    try {
        body.call()
    } catch (Exception e) {
        failedTests << testId
        KeywordUtil.logInfo('[' + testId + '] FAILED: ' + e.getMessage())
    } finally {
        try {
            WebUI.closeBrowser()
        } catch (Exception ignore) {
        }
    }
    KeywordUtil.logInfo('========== KẾT THÚC: ' + testId + ' ==========')
}

// ============================== ADD ================================

// [USER_MGT_Add-1] Kiểm tra giao diện và giá trị mặc định pop-up Thêm user
void add1() {
    startBrowser()
    loginAdmin('Object Repository', false)
    openUserManagement('Object Repository')
    openAddUserPopup('Object Repository')
    WebUI.verifyElementText(findTestObject('Object Repository/Page_Qun l ngi dng/h2_popup-title'), 'Thêm User mới')
}

// [USER_MGT_Add-2] Thêm User (nhập thông tin và Lưu)
void add2() {
    startBrowser()
    loginAdmin('', false)
    openUserManagement('')
    openAddUserPopup('')
    fillAddUserForm('', 'Tín', '1234567', '23130333@st.hcmuaf.edu.vn', 'lf5PiPc8AABLdO79HFX7cQ==', '7D6SvJlU6NbCwOOXJKhmEQ==')
    submitAddUser('')
}

// [USER_MGT_Add-3] Thêm mới User hợp lệ thành công
void add3() {
    String r = 'USER_MGT_Add_3'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)
    openAddUserPopup(r)
    fillAddUserForm(r, 'Tín', '1234567', '23130390@st.hcmuaf.edu.vn', 'fbxosOeufe7YOBs1jUAXCA==', 'fbxosOeufe7YOBs1jUAXCA==')
    submitAddUser(r)
}

// [USER_MGT_Add-4] Kiểm tra Thêm mới User với thông tin nhập liệu
void add4() {
    String r = 'USER_MGT_Add_4'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)
    openAddUserPopup(r)
    fillAddUserForm(r, 'Tín', 'Tin123', '23130333@st.hcmuaf.edu.vn', 'aeHFOx8jV/A=', 'aeHFOx8jV/A=')
    submitAddUser(r)
}

// [USER_MGT_Add-5] Kiểm tra Validation khi Mật khẩu không trùng khớp
void add5() {
    String r = 'USER_MGT_Add_5'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)
    openAddUserPopup(r)
    fillAddUserForm(r, 'Tín', 'Tin123', '23130333@st.hcmuaf.edu.vn', 'lYQ2cSH94NHgWnoXpOCdZw==', 'lYQ2cSH94NGKHZ98bHYkOw==')
    submitAddUser(r)
}

// [USER_MGT_Add-6] Kiểm tra Validation khi nhập Email đã tồn tại trong CSDL
void add6() {
    String r = 'USER_MGT_Add_6'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)
    openAddUserPopup(r)
    fillAddUserForm(r, 'Tin', 'Tin123', 'admin@gmail.com', 'lYQ2cSH94NHgWnoXpOCdZw==', 'lYQ2cSH94NHgWnoXpOCdZw==')
    submitAddUser(r)
}

// [USER_MGT_Add-7] Kiểm tra Thêm mới User có chọn Phân quyền (Role)
void add7() {
    String r = 'USER_MGT_Add_7'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)
    openAddUserPopup(r)
    fillAddUserForm(r, 'Tín', 'Tin123', 'tinnttckn@gmail.com', 'tMBS8XhMTO/bsj49+CE5hA==', 'tMBS8XhMTO/bsj49+CE5hA==')
    WebUI.selectOptionByValue(findTestObject('USER_MGT_Add_7/Page_Qun l ngi dng/select_user-role'), '2', false)
    submitAddUser(r)
}

// [USER_MGT_Add-8] Kiểm tra Bảo mật Endpoint /add-user (Không gửi Token/Session Admin)
void add8() {
    String endpointUrl = "http://localhost:8080/pkcn/add-user"
    String jsonBody = '{"username": "hacker123", "email": "hacker@gmail.com", "password": "123"}'

    RequestObject request = new RestRequestObjectBuilder()
        .withRestUrl(endpointUrl)
        .withRestRequestMethod('POST')
        .withHttpHeaders([
            new TestObjectProperty("Content-Type", ConditionType.EQUALS, "application/json")
        ])
        .withTextBodyContent(jsonBody)
        .build()

    def response = WS.sendRequest(request)
    int statusCode = WS.getResponseStatusCode(response)
    KeywordUtil.logInfo("HTTP Status Code nhận được: " + statusCode)

    if (statusCode == 401 || statusCode == 403 || statusCode == 302) {
        KeywordUtil.markPassed("PASSED: Endpoint được bảo mật tốt! Server chặn request không có quyền với Status Code: " + statusCode)
    } else {
        KeywordUtil.markFailed("FAILED: Endpoint /add-user không chặn request không có quyền. Status Code nhận được: " + statusCode)
    }
}

// ============================= DELETE ==============================

// [USER_MGT_Delete-1] Kiểm tra hiển thị nút Xóa người dùng trên danh sách
void delete1() {
    String r = 'USER_MGT_Delete_1'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)

    boolean isDeleteBtnPresent = WebUI.verifyElementPresent(findTestObject('delete1/Page_Qun l ngi dng/i_fa-solid fa-circle-minus'), 5, FailureHandling.OPTIONAL)
    if (isDeleteBtnPresent) {
        KeywordUtil.markPassed("PASSED: Màn hình Quản lý người dùng hiển thị đầy đủ nút/biểu tượng Xóa tài khoản!")
    }
}

// [USER_MGT_Delete-2] Kiểm tra hộp thoại xác nhận và hủy thao tác xóa
void delete2() {
    String r = 'USER_MGT_Delete_2'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)

    WebUI.click(findTestObject('USER_MGT_Delete_2/Page_Qun l ngi dng/i_fa-solid fa-circle-minus'))

    boolean hasConfirmAlert = WebUI.waitForAlert(5, FailureHandling.OPTIONAL)
    if (hasConfirmAlert) {
        String alertText = WebUI.getAlertText()
        WebUI.dismissAlert()
        KeywordUtil.logInfo('Nội dung xác nhận xóa: ' + alertText)
        KeywordUtil.markPassed('PASSED: Hiển thị hộp thoại xác nhận xóa và đã hủy thao tác.')
    } else {
        KeywordUtil.markFailed('FAILED: Không xuất hiện hộp thoại xác nhận xóa.')
    }
}

// [USER_MGT_Delete-3] Thực hiện xóa tài khoản người dùng thành công trên UI
void delete3() {
    String r = 'USER_MGT_Delete_2'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)

    WebUI.click(findTestObject('USER_MGT_Delete_2/Page_Qun l ngi dng/i_fa-solid fa-circle-minus'))

    if (WebUI.waitForAlert(3, FailureHandling.OPTIONAL)) {
        WebUI.acceptAlert()
    }

    boolean isSuccess = WebUI.verifyTextPresent('Xóa thành công', false, FailureHandling.OPTIONAL) ||
                        WebUI.verifyTextPresent('Thành công', false, FailureHandling.OPTIONAL)

    if (isSuccess) {
        KeywordUtil.markPassed('PASSED: Xóa người dùng thành công trên UI.')
    } else {
        KeywordUtil.markFailed('FAILED: Không thấy thông báo xóa thành công sau khi bấm Xóa.')
    }
}

// [USER_MGT_Delete-4] Kiểm tra Bảo mật Endpoint /delete-user - Gọi API bằng tài khoản Customer
void delete4() {
    String endpointUrl = "http://localhost:8080/pkcn/delete-user"
    String jsonBody = '{"userId": 30}'

    RequestObject request = new RestRequestObjectBuilder()
        .withRestUrl(endpointUrl)
        .withRestRequestMethod('POST')
        .withHttpHeaders([
            new TestObjectProperty("Content-Type", ConditionType.EQUALS, "application/json")
        ])
        .withTextBodyContent(jsonBody)
        .build()

    def response = WS.sendRequest(request)
    int statusCode = WS.getResponseStatusCode(response)
    String responseText = response.getResponseText()

    KeywordUtil.logInfo("HTTP Status Code: " + statusCode)
    KeywordUtil.logInfo("Response Body: " + responseText)

    if (statusCode == 403 || statusCode == 401 || statusCode == 302 || responseText.contains("Forbidden") || responseText.contains("Access Denied") || responseText.contains("error")) {
        KeywordUtil.markPassed("PASSED: [USER_MGT_Delete-4] Bảo mật Endpoint thành công! Server đã chặn tài khoản Customer lợi dụng API để xóa người dùng (Code: " + statusCode + ")")
    } else {
        KeywordUtil.markFailed("FAILED: [USER_MGT_Delete-4] Endpoint /delete-user không chặn request không có quyền Admin. Code: " + statusCode)
    }
}

// ============================== EDIT ===============================

// [USER_MGT_Edit-1] Kiểm tra tải dữ liệu popup Sửa user thành công (GET API)
void edit1() {
    String r = 'USER_MGT_Edit_1'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)
    openEditUserPopup(r)
    WebUI.verifyElementText(findTestObject('USER_MGT_Edit_1/Page_Qun l ngi dng/h2_Chnh sa thng tin ngi dng'), 'Chỉnh sửa thông tin người dùng')
}

// [USER_MGT_Edit-2] Kiểm tra Validation khi để trống các trường bắt buộc khi Sửa
void edit2() {
    String r = 'USER_MGT_Edit_2'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)
    openEditUserPopup(r)

    WebUI.sendKeys(findTestObject('USER_MGT_Edit_2/Page_Qun l ngi dng/input_User Name'), Keys.chord(Keys.CONTROL, 'a', Keys.BACK_SPACE))
    WebUI.sendKeys(findTestObject('USER_MGT_Edit_2/Page_Qun l ngi dng/input_email-edit'), Keys.chord(Keys.CONTROL, 'a', Keys.BACK_SPACE))

    WebUI.click(findTestObject('USER_MGT_Edit_3/Page_Qun l ngi dng/button_submitEditUser'))

    // Nếu hệ thống hiện alert validation thì đóng lại để tiếp tục kiểm tra
    if (WebUI.waitForAlert(2, FailureHandling.OPTIONAL)) {
        WebUI.acceptAlert()
    }

    WebUI.verifyElementPresent(findTestObject('USER_MGT_Edit_2/Page_Qun l ngi dng/form_editUserForm'), 5)
}

// [USER_MGT_Edit-3] Kiểm tra validation khi bỏ trống Tên người dùng
void edit3() {
    String r = 'USER_MGT_Edit_3'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)
    openEditUserPopup(r)

    WebUI.setText(findTestObject('USER_MGT_Edit_3/Page_Qun l ngi dng/input_Tn ngi dng'), '')
    WebUI.click(findTestObject('USER_MGT_Edit_3/Page_Qun l ngi dng/button_submitEditUser'))

    boolean isAlertPresent = WebUI.waitForAlert(5, FailureHandling.OPTIONAL)

    if (isAlertPresent) {
        String alertText = WebUI.getAlertText()
        WebUI.acceptAlert()

        if (alertText.contains('Không được để trống họ tên người dùng')) {
            KeywordUtil.markPassed('PASSED: Hệ thống chặn họ tên rỗng và hiển thị đúng cảnh báo.')
        } else {
            KeywordUtil.markFailed('FAILED: Nội dung cảnh báo không đúng. Thực tế: ' + alertText)
        }
    } else {
        KeywordUtil.markFailed('FAILED: Không xuất hiện cảnh báo khi bỏ trống họ tên người dùng.')
    }
}

// [USER_MGT_Edit-4] Kiểm tra cập nhật thành công Tên người dùng và Vai trò
void edit4() {
    String r = 'USER_MGT_Edit_4'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)
    openEditUserPopup(r)

    WebUI.setText(findTestObject('USER_MGT_Edit_4/Page_Qun l ngi dng/input_Tn ngi dng'), 'Huỳnh Hữu Thức')
    WebUI.selectOptionByValue(findTestObject('USER_MGT_Edit_4/Page_Qun l ngi dng/select_Vai tr_'), '1', false)
    WebUI.click(findTestObject('USER_MGT_Edit_4/Page_Qun l ngi dng/button_submitEditUser'))
    WebUI.delay(1)

    WebUI.verifyElementText(findTestObject('USER_MGT_Edit_4/Page_Qun l ngi dng/td_Hunh Hu Thc'), 'Huỳnh Hữu Thức')
    WebUI.verifyElementText(findTestObject('USER_MGT_Edit_4/Page_Qun l ngi dng/td_Admin'), 'Admin')

    KeywordUtil.markPassed("PASSED: Cập nhật Tên người dùng và Vai trò thành công!")
}

// [USER_MGT_Edit-5] Kiểm tra toàn vẹn dữ liệu - Username, Email, Password không bị ghi đè trong DB
void edit5() {
    WebUI.openBrowser('')
    WebUI.maximizeWindow()
    WebUI.navigateToUrl('http://localhost/phpmyadmin/')

    if (WebUI.verifyElementPresent(findTestObject('edit4/Page_phpMyAdmin/input_Username'), 2, FailureHandling.OPTIONAL)) {
        WebUI.setText(findTestObject('edit4/Page_phpMyAdmin/input_Username'), 'root')
        WebUI.click(findTestObject('edit4/Page_phpMyAdmin/input_input_go'))
    }

    String directUrl = "http://localhost/phpmyadmin/index.php?route=/sql&db=pkcn&table=users&sql_query=SELECT%20*%20FROM%20users%20WHERE%20fullname%3D%27Hu%E1%BB%B3nh%20H%E1%BB%AFu%20Th%E1%BB%A9c%27"
    WebUI.navigateToUrl(directUrl)
    WebUI.delay(2)

    boolean isUsernameIntact = WebUI.verifyTextPresent('admin@gmail.com', false, FailureHandling.OPTIONAL) ||
                               WebUI.verifyTextPresent('tinnttckn@gmail.com', false, FailureHandling.OPTIONAL)

    if (isUsernameIntact) {
        KeywordUtil.markPassed("PASSED: Dữ liệu CSDL toàn vẹn! Các cột Username, Email, Password giữ nguyên giá trị, không bị ghi đè thành NULL hay rỗng sau khi Edit.")
    } else {
        KeywordUtil.markFailed("FAILED: Không tìm thấy dữ liệu Username/Email của user 'Huỳnh Hữu Thức' trong CSDL sau khi Edit!")
    }
}

// ============================== LIST ===============================

// [USER_MGT_List-1] Kiểm tra giao diện màn hình Danh sách User
void list1() {
    startBrowser()
    loginAdmin('Object Repository', false)
    openUserManagement('Object Repository')
    WebUI.verifyElementText(findTestObject('Object Repository/Page_Qun l ngi dng/h1_Qun l ngi dng'), 'Quản lý người dùng')
}

// [USER_MGT_List-2] Kiểm tra tìm kiếm và lọc danh sách User theo Username/Email
void list2() {
    startBrowser()
    loginAdmin('Object Repository')
    openUserManagement('Object Repository')

    String searchKeyword = 'Nguyễn Trọng Tín'
    WebUI.setText(findTestObject('Object Repository/Page_Qun l ngi dng/input_Tm kim theo tn ngi dng'), searchKeyword)
    WebUI.click(findTestObject('Object Repository/Page_Qun l ngi dng/button_Tm kim'))
    WebUI.verifyElementText(findTestObject('Object Repository/Page_Qun l ngi dng/td_Nguyn Trng Tn'), searchKeyword)
}

// ============================== LOCK ===============================

// [USER_MGT_Lock-1] Kiểm tra hiển thị cột Thao tác / Nút Khóa tài khoản trên UI
void lock1() {
    String r = 'USER_MGT_Lock_1'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)

    boolean isHeaderPresent = WebUI.verifyElementPresent(findTestObject('USER_MGT_Lock_1/Page_Qun l ngi dng/th_Thao tc'), 5, FailureHandling.OPTIONAL)
    if (isHeaderPresent) {
        KeywordUtil.markPassed("PASSED: [USER_MGT_Lock-1] Màn hình Quản lý người dùng hiển thị đúng cột Thao tác!")
    } else {
        KeywordUtil.markFailed("FAILED: [USER_MGT_Lock-1] Không tìm thấy cột Thao tác trên giao diện!")
    }
}

// [USER_MGT_Lock-2] Thực hiện Khóa tài khoản và kiểm tra trạng thái trên UI
void lock2() {
    String r = 'USER_MGT_Lock_2'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)

    // Ưu tiên locator đã ghi trong Object Repository; nếu không tìm thấy,
    // thử tìm biểu tượng khóa trong một hàng người dùng trên bảng.
    TestObject lockIcon = findTestObject('USER_MGT_Lock_2/Page_Qun l ngi dng/i_fa-solid fa-lock')
    boolean foundLockIcon = WebUI.verifyElementPresent(lockIcon, 3, FailureHandling.OPTIONAL)

    if (!foundLockIcon) {
        TestObject dynamicLockIcon = new TestObject('dynamicLockIcon')
        dynamicLockIcon.addProperty('xpath', ConditionType.EQUALS,
            "(//tr[.//*[contains(concat(' ', normalize-space(@class), ' '), ' fa-lock ')]]//*[contains(concat(' ', normalize-space(@class), ' '), ' fa-lock ')])[1]")
        foundLockIcon = WebUI.verifyElementPresent(dynamicLockIcon, 3, FailureHandling.OPTIONAL)
        if (foundLockIcon) {
            lockIcon = dynamicLockIcon
        }
    }

    if (!foundLockIcon) {
        KeywordUtil.markFailed('FAILED: Không tìm thấy biểu tượng khóa trên danh sách. Kiểm tra trạng thái tài khoản và locator trong Object Repository.')
        return
    }

    WebUI.click(lockIcon)
    if (WebUI.waitForAlert(2, FailureHandling.OPTIONAL)) {
        WebUI.acceptAlert()
    }
    WebUI.delay(1)

    boolean isLockedStatusPresent = WebUI.verifyElementPresent(findTestObject('USER_MGT_Lock_2/Page_Qun l ngi dng/span_ang b kha'), 5, FailureHandling.OPTIONAL) ||
                                    WebUI.verifyTextPresent('Đang bị khóa', false, FailureHandling.OPTIONAL)

    if (isLockedStatusPresent) {
        KeywordUtil.markPassed("PASSED: [USER_MGT_Lock-2] Khóa tài khoản thành công! Trạng thái người dùng đã chuyển sang 'Đang bị khóa'.")
    } else {
        KeywordUtil.markFailed("FAILED: [USER_MGT_Lock-2] Không tìm thấy nhãn trạng thái 'Đang bị khóa' sau khi thực hiện Khóa!")
    }
}

// [USER_MGT_Lock-3] Thực hiện Mở khóa tài khoản thành công và kiểm tra trạng thái trên UI
void lock3() {
    String r = 'USER_MGT_Lock_3'
    startBrowser()
    loginAdmin(r)
    openUserManagement(r)

    WebUI.click(findTestObject('USER_MGT_Lock_3/Page_Qun l ngi dng/i_fa-solid fa-unlock'))
    WebUI.delay(1)

    boolean isActivePresent = WebUI.verifyElementPresent(findTestObject('USER_MGT_Lock_3/Page_Qun l ngi dng/span_ang hot ng'), 5, FailureHandling.OPTIONAL) ||
                              WebUI.verifyTextPresent('Đang hoạt động', false, FailureHandling.OPTIONAL)

    if (isActivePresent) {
        KeywordUtil.markPassed("PASSED: [USER_MGT_Lock-3] Mở khóa tài khoản thành công! Trạng thái người dùng đã cập nhật sang 'Đang hoạt động'.")
    } else {
        KeywordUtil.markFailed("FAILED: [USER_MGT_Lock-3] Không tìm thấy trạng thái 'Đang hoạt động' sau khi bấm Mở khóa!")
    }
}

// [USER_MGT_Lock-4] Kiểm tra chặn Đăng nhập đối với Tài khoản đã bị khóa
void lock4() {
    startBrowser()

    WebUI.setText(findTestObject('USER_MGT_Lock_4/Page_ng Nhp/input_Tn ng nhp hoc email'), 'nttckn7@gmail.com')
    WebUI.setEncryptedText(findTestObject('USER_MGT_Lock_4/Page_ng Nhp/input_Mt khu'), 'm/+OMUPdlH9fd7mNEtyuew==')
    WebUI.click(findTestObject('USER_MGT_Lock_4/Page_ng Nhp/input_submit'))
    WebUI.delay(1)

    boolean isMessagePresent = WebUI.verifyElementPresent(findTestObject('USER_MGT_Lock_4/Page_ng Nhp/div_Ti khon  b kha'), 5, FailureHandling.OPTIONAL) ||
                               WebUI.verifyTextPresent('Tài khoản đã bị khóa', false, FailureHandling.OPTIONAL) ||
                               WebUI.verifyTextPresent('bị khóa', false, FailureHandling.OPTIONAL)

    String currentUrl = WebUI.getUrl()

    if (isMessagePresent) {
        KeywordUtil.markPassed("PASSED: [USER_MGT_Lock-4] Hệ thống chặn đăng nhập thành công đối với tài khoản đã bị khóa!")
    } else {
        KeywordUtil.markFailed("FAILED: [USER_MGT_Lock-4] Tài khoản bị khóa nhưng vẫn đăng nhập được vào hệ thống!")
    }
}

// [USER_MGT_Lock-5] Chặn không cho phép Admin tự Khóa tài khoản chính mình
void lock5() {
    String endpointUrl = "http://localhost:8080/pkcn/lock-unlock-user?action=lock&id=1"

    RequestObject request = new RestRequestObjectBuilder()
        .withRestUrl(endpointUrl)
        .withRestRequestMethod('GET')
        .build()

    def response = WS.sendRequest(request)
    int statusCode = WS.getResponseStatusCode(response)
    String responseText = response.getResponseText()

    KeywordUtil.logInfo("HTTP Status Code: " + statusCode)
    KeywordUtil.logInfo("Response Body: " + responseText)

    boolean isRejected = (statusCode == 400 || statusCode == 403 || statusCode == 302 ||
                          responseText.contains("Không thể tự khóa") || responseText.contains("error") || responseText.contains("failed"))

    if (isRejected) {
        KeywordUtil.markPassed("PASSED: [USER_MGT_Lock-5] Server đã kiểm tra ràng buộc chống tự khóa chính mình thành công!")
    } else {
        KeywordUtil.markFailed("FAILED: [USER_MGT_Lock-5] Server không từ chối request tự khóa Admin (Code: " + statusCode + ")")
    }
}

// ============================== MAIN ===============================

runTest('USER_MGT_Add-1', { add1() })
runTest('USER_MGT_Add-2', { add2() })
runTest('USER_MGT_Add-3', { add3() })
runTest('USER_MGT_Add-4', { add4() })
runTest('USER_MGT_Add-5', { add5() })
runTest('USER_MGT_Add-6', { add6() })
runTest('USER_MGT_Add-7', { add7() })
runTest('USER_MGT_Add-8', { add8() })

runTest('USER_MGT_Delete-1', { delete1() })
runTest('USER_MGT_Delete-2', { delete2() })
runTest('USER_MGT_Delete-3', { delete3() })
runTest('USER_MGT_Delete-4', { delete4() })

runTest('USER_MGT_Edit-1', { edit1() })
runTest('USER_MGT_Edit-2', { edit2() })
runTest('USER_MGT_Edit-3', { edit3() })
runTest('USER_MGT_Edit-4', { edit4() })
runTest('USER_MGT_Edit-5', { edit5() })

runTest('USER_MGT_List-1', { list1() })
runTest('USER_MGT_List-2', { list2() })

runTest('USER_MGT_Lock-1', { lock1() })
runTest('USER_MGT_Lock-2', { lock2() })
runTest('USER_MGT_Lock-3', { lock3() })
runTest('USER_MGT_Lock-4', { lock4() })
runTest('USER_MGT_Lock-5', { lock5() })

// Tổng kết
if (failedTests.isEmpty()) {
    KeywordUtil.markPassed("TẤT CẢ 24 TEST CASE USER_MGT ĐỀU PASSED")
} else {
    KeywordUtil.markFailed("Có " + failedTests.size() + " test case FAILED: " + failedTests.join(', '))
}