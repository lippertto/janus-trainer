import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { jwtDecode } from 'jwt-decode';
import { GraphQLClient, gql } from 'graphql-request';

type UserProfileResponse = {
  findOneUserProfile: {
    name: string;
    firstname: string;
    membershipNumber: string;
  };
};

@Injectable()
export class AppackGraphQlClient {
  private currentToken: string | null = null;
  private tokenValidUntil: number = 0;
  /** Do not use this client directly. Instead call getClient */
  private _client: GraphQLClient | null = null;

  constructor(
    private readonly baseUrl,
    private readonly apiToken,
  ) {}

  async findOneUserProfile(id: string) {
    const document = gql`
      {
          findOneUserProfile(profileId: "${id}")
          {
              firstname,
              name,
              membershipNumber
            }
        }
        `;

    const client = await this.getClient();
    const result = await client.request<UserProfileResponse>(document);
    return result.findOneUserProfile;
  }

  async requestNewToken() {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: '{"query":"{getToken}"}',
    });
    if (response.status !== 200) {
      throw new InternalServerErrorException(
        `Could not retrieve new Appack token. ${await response.text()}`,
      );
    }
    const payload = await response.json();
    const jwt = payload.data.getToken as string;
    this.tokenValidUntil = jwtDecode(jwt).exp;
    return jwt;
  }

  async getClient() {
    const now = Date.now() / 1000;
    // token is valid for more than 60 seconds. We can reuse the client
    if (this.tokenValidUntil - 60 >= now) {
      return this._client;
    }

    this.currentToken = await this.requestNewToken();

    this._client = new GraphQLClient(this.baseUrl, {
      headers: {
        authorization: `Bearer ${this.currentToken}`,
      },
    });
    return this._client;
  }
}
