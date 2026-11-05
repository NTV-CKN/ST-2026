'use strict';

class PaymentPage {
  constructor(page) {
    this.page = page;
    this.form = page.locator('#formCheckout');
    this.placeOrderButton = page.locator('#place-order');
    this.items = page.locator('#order-review tr.cart-item');
    this.subtotal = page.locator('tr.cart-subtotal .price-amount');
    this.shippingFee = page.locator('tr.ship-fee .price-amount');
    this.total = page.locator('tr.order-total .price-amount');
    this.note = page.locator('textarea[name="note"]');
    this.addressBlock = page.locator('#customer_details');
    this.changeAddressButton = page.locator('.btn-address');
    this.methodRadios = page.locator('input[name="paymentMethodId"]');
  }

  async goto() {
    await this.page.goto('/view-payment');
  }

  itemRow(productName) {
    return this.items.filter({ hasText: productName });
  }

  async chooseMethod(id) {
    await this.page.locator(`#payment-method-${id}`).check();
  }

  async placeOrder() {
    await this.placeOrderButton.click();
  }
}

module.exports = { PaymentPage };
