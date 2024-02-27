// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// cypress/support/auth-provider-commands/cognito.ts
// Amazon Cognito
const loginToCognito = (username: string, password: string) => {
  Cypress.log({
    displayName: 'COGNITO LOGIN',
    message: [`🔐 Authenticating | ${username}`],
    autoEnd: false,
  });

  cy.visit('/');
  cy.get('[data-testid="PersonOutlineIcon"] > path').click();
  cy.get('.MuiList-root > .MuiButtonBase-root').click();
  cy.contains('Sign in with Cognito').click();

  cy.origin(
    Cypress.env('cognito_domain'),
    {
      args: {
        username,
        password,
      },
    },
    ({ username, password }) => {
      // Cognito log in page has some elements of the same id but are off screen.
      // We only want the visible elements to log in
      cy.get('input[name="username"]:visible').type(username);
      cy.get('input[name="password"]:visible').type(password, {
        // use log: false to prevent your password from showing in the Command Log
        log: false,
      });
      cy.get('input[name="signInSubmitButton"]:visible').click();
    },
  );

  // give a few seconds for redirect to settle
  // cy.wait(2000);

  // verify we have made it passed the login screen
  // cy.contains('Get Started').should('be.visible')
};

// right now our custom command is light. More on this later!
Cypress.Commands.add('loginByCognito', (username: string, password: string) => {
  cy.session(
    `cognito-${username}`,
    () => {
      return loginToCognito(username, password);
    },
    {
      validate() {
        cy.visit('/');
        cy.contains('Menüpunk').should('be.visible');
      },
    },
  );
});
