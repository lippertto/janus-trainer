import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AppUserDto } from 'janus-trainer-dto';
import { AppackGraphQlClient } from './AppackGraphQlClient';

@Injectable()
export class AppUsersService {
  constructor(private client: AppackGraphQlClient) {}

  async queryMemberById(id: string): Promise<AppUserDto | null> {
    try {
      return this.client.findOneUserProfile(id);
    } catch (error) {
      const message: string | null =
        error?.response?.errors?.at(0)?.message ?? error?.response?.error;
      const status: number | null =
        error?.response?.errors?.at(0)?.status ?? error?.response?.status;
      if (message && message.includes('"profile" is null')) {
        return null;
      } else if (status === 401) {
        throw new InternalServerErrorException(
          'Permission denied to Appack API',
        );
      } else {
        throw new InternalServerErrorException(
          'Error while talking to the Appack API',
          error?.message,
        );
      }
    }
  }
}
