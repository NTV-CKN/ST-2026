'use strict';

class SignOrderPage {
  constructor(page) {
    this.page = page;
    this.heading = page.locator('.card-header h1');
    this.errorBox = page.locator('.alert-danger');
    this.keyInfo = page.locator('.key-info-box');
    this.formatData = page.locator('#formatDataArea');
    this.hashInput = page.locator('#hashDataInput');
    this.copyHashButton = page.locator('#btnCopyHash');
    this.downloadHashButton = page.locator('#btnDownloadHash');
    this.uploadSignatureButton = page.locator('#btnUploadSignature');
    this.signatureFileInput = page.locator('#fileSignatureInput');
    this.signatureInput = page.locator('#signatureInput');
    this.confirmButton = page.locator('#btnConfirmSignature');
  }

  async goto(orderId) {
    await this.page.goto(`/process-sign-order?orderId=${orderId}`);
  }

  async hash() {
    return (await this.hashInput.inputValue()).trim();
  }

  async signWith(signature) {
    await this.signatureInput.fill(signature);
    await this.confirmButton.click();
  }
}

module.exports = { SignOrderPage };
