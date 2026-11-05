'use strict';

class OrderHistoryPage {
  constructor(page) {
    this.page = page;
  }

  async goto(query = '') {
    await this.page.goto(`/order-history${query}`);
  }

  card(orderId) {
    return this.page.locator(`.wrap-content-order[data-id="${orderId}"]`);
  }

  signButton(orderId) {
    return this.card(orderId).locator('.btn-sign-order');
  }

  verifiedIcon(orderId) {
    return this.card(orderId).locator('.verify-icon.verified');
  }

  unverifiedIcon(orderId) {
    return this.card(orderId).locator('.verify-icon.no-verify');
  }

  async openSigning(orderId) {
    await this.signButton(orderId).click();
    await this.page.waitForURL(new RegExp(`/process-sign-order\\?orderId=${orderId}`));
  }
}

module.exports = { OrderHistoryPage };
