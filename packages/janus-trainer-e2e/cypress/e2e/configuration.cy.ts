describe('configuration', () => {
  beforeEach(() => {
    cy.loginByCognito(
      Cypress.env('cognito_admin_username'),
      Cypress.env('cognito_admin_password'),
    );
    cy.visit('/configure');
    cy.get('[data-testid="configure-button-clear-database"]').click();
  });

  it('adds holidays', () => {
    cy.loginByCognito(
      Cypress.env('cognito_admin_username'),
      Cypress.env('cognito_admin_password'),
    );
    cy.visit('/configure');
    cy.get('[data-testid="holiday-table"]').should(
      'not.contain',
      'Tag der dt. Einheit',
    );

    cy.get('[data-testid="add-holiday-button"]').click();
    cy.get('[id="holiday-date-picker-start"').type('03.10.2024');
    cy.get('[id="holiday-date-picker-end"').type('03.10.2024');
    cy.get('[data-testid="holiday-text-field-description"]').type(
      'Tag der dt. Einheit',
    );
    cy.get('[data-testid="holiday-button-submit"]').click();
    cy.get('[data-testid="holiday-table"]').should(
      'contain',
      'Tag der dt. Einheit',
    );
  });
});
