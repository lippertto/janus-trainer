describe('template spec', () => {
  it('passes', () => {
    cy.loginByCognito(
      Cypress.env('cognito_username'),
      Cypress.env('cognito_password'),
    );
    cy.visit('/enter');
  });
});
