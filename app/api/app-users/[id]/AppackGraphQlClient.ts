import { jwtDecode } from 'jwt-decode';
import { GraphQLClient, gql } from 'graphql-request';
import { ApiErrorInternalServerError } from '@/lib/helpers-for-api';
import { AppUser } from '@/lib/dto';

type UserProfileResponse = {
  findOneUserProfile: {
    name: string;
    firstname: string;
    membershipNumber: string;
  };
};

export class AppackGraphQlClient {
  private currentToken: string | null = null;
  private tokenValidUntil: number = 0;
  /** Do not use this client directly. Instead call getClient */
  private _client: GraphQLClient | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly apiToken: string,
  ) {}

  async findOneUserProfile(id: string): Promise<AppUser> {
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

  async requestNewToken(): Promise<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: '{"query":"{getToken}"}',
    });
    if (response.status !== 200) {
      throw new ApiErrorInternalServerError(
        `Could not retrieve new Appack token. ${await response.text()}`,
      );
    }
    const payload = await response.json();
    const jwt = payload.data.getToken as string;
    this.tokenValidUntil = jwtDecode(jwt).exp!;
    return jwt;
  }

  async getClient(): Promise<GraphQLClient> {
    const now = Date.now() / 1000;
    // token is valid for more than 60 seconds. We can reuse the client
    if (this.tokenValidUntil - 60 >= now) {
      return this._client!;
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

const APPACK_API = 'https://api.appack.de/graphql';

const API_TOKEN =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6InNjLWphbnVzIiwidXNlcm5hbWUiOiJsdHJkQGZhc3RtYWlsLmZtIiwiaXNzIjoiYXBwYWNrIiwiZXhwIjoxNzM1NjQ0MDgzLCJpYXQiOjE3MTA1MTgwNTEsInNjb3BlIjpbImdldF90b2tlbiJdfQ.F0Dt7KIYnlPJxz-AHjm07cOkbZlsZfykFEDZ8WmuRnGJ0olShJFBUYQBieH9GhVWDTYW_ZS3L5zIii9bFgF-ltc79e_xqMuWzeBDroytb1jIUkV_rKHZTK1-OFgEiNMRnlCmiDdJrkRbre0txH0WsdSj55iHucWArQM2k-LZBhcj9zXUItGL1RlE85NwFH9txd1EQt0ck-iZ-obOJQLoYqViKecYAjVdhsoaASIyTApS6lHDaDOWZHHLyEqhZG9G_TL84k_a5u9_2lWWZpW5ezW0SGSwHHFCjhdXgZMpbaIGXoC0P8kuntFtiP3vQhqjvqZs6EJrVm3Ra_pKQe6_hg';

export const appackClient = new AppackGraphQlClient(APPACK_API, API_TOKEN);
