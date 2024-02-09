import { BadRequestException, Injectable } from '@nestjs/common';

import dayjs from 'dayjs';

@Injectable()
export class SharedService {
  dateStringToDate(dateString: string): dayjs.Dayjs {
    const components = dateString.split('-');
    if (
      components.length != 3 ||
      components[0].length != 4 ||
      components[1].length != 2 ||
      components[2].length != 2
    ) {
      throw new BadRequestException(
        `Date ${dateString} is not in the correct format`,
      );
    }
    return dayjs(
      new Date(
        parseInt(components[0]),
        parseInt(components[1]) - 1,
        parseInt(components[2]),
      ),
    );
  }
}
