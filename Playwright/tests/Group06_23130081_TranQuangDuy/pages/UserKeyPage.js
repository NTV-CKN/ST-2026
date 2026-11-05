'use strict';

class UserKeyPage {
  constructor(page) {
    this.page = page;
    this.title = page.locator('.key-title');
    this.form = page.locator('#registerKeyForm');
    this.nameInput = page.locator('#keyName');
    this.publicKeyInput = page.locator('#publicKey');
    this.fileInput = page.locator('#fileUpload');
    this.submitButton = page.locator('.btn-submit-key');
    this.downloadTool = page.locator('.btn-download-tool');
    this.rows = page.locator('.key-table tbody tr');
    this.revokeButtons = page.locator('.btn-revoke');
  }

  async goto() {
    await this.page.goto('/user-key');
  }

  row(keyName) {
    return this.rows.filter({ hasText: keyName });
  }

  async selectAlgorithm(algorithm) {
    await this.page.locator(`input[name="algorithm"][value="${algorithm}"]`).check();
  }

  async fillForm({ keyName, publicKey, algorithm = 'RSA' }) {
    await this.nameInput.fill(keyName);
    await this.selectAlgorithm(algorithm);
    await this.publicKeyInput.fill(publicKey);
  }

  async submit() {
    await this.submitButton.click();
  }

  async revoke(keyName) {
    await this.row(keyName).locator('.btn-revoke').click();
  }
}

module.exports = { UserKeyPage };
