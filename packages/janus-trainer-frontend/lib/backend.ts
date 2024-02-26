import dayjs from 'dayjs';
import {
  TrainingCreateRequestDto,
  TrainingDto,
  TrainingUpdateRequestDto,
} from 'janus-trainer-dto';

type CompensationResponse = {
  periodStart: string;
  periodEnd: string;
  correspondingIds: string[];
  user: {
    id: string;
    name: string;
    iban: string;
  };
  totalCompensationCents: number;
  totalTrainings: number;
};

/**
 * Proxies all interaction with the backend.
 * Before you can use it, you should set an access token with {@link setAccessToken}
 */
export class Backend {
  baseUrl: string;
  accessToken: string | null = null;

  constructor(baseUrl: string | undefined = undefined) {
    if (baseUrl === undefined || baseUrl === '') {
      baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:2000';
    }
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.substring(0, baseUrl.length - 1);
    }
    this.baseUrl = baseUrl;
  }

  setAccessToken(value: string | null) {
    this.accessToken = value;
  }

  /** Returns the authorization header to be used with the backend http requests. */
  authorizationHeader(): { Authorization: string } {
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  /** Returns the URL with the given sub-path by prepending the baseUrl.  */
  withPath(path: string) {
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    return `${this.baseUrl}${path}`;
  }

  async logIn(): Promise<boolean> {
    const response = await fetch(this.withPath('/auth'), {
      method: 'POST',
      cache: 'no-cache',
      headers: {
        ...this.authorizationHeader(),
      },
    });
    return response.status === 201;
  }

  async addTraining(
    date: string,
    disciplineId: string,
    group: string,
    compensationCents: number,
    participantCount: number,
    userId: string,
  ): Promise<TrainingDto> {
    const request: TrainingCreateRequestDto = {
      date,
      disciplineId,
      group,
      compensationCents,
      participantCount,
      userId,
    };

    const response = await fetch(this.withPath('/trainings'), {
      method: 'POST',
      body: JSON.stringify(request),
      cache: 'no-cache',
      headers: {
        ...this.authorizationHeader(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const result = await response.json();
    return result as TrainingDto;
  }

  async updateTraining(
    id: string,
    date: string,
    disciplineId: string,
    group: string,
    compensationCents: number,
    participantCount: number,
  ): Promise<TrainingDto> {
    const request: TrainingUpdateRequestDto = {
      date,
      disciplineId,
      group,
      compensationCents,
      participantCount,
    };
    const response = await fetch(this.withPath(`/trainings/${id}`), {
      method: 'PUT',
      body: JSON.stringify(request),
      headers: {
        ...this.authorizationHeader(),
        'Content-Type': 'application/json',
      },
    });
    const result = await response.json();
    return result as TrainingDto;
  }

  async getTrainingsByDate(
    startDate: dayjs.Dayjs,
    endDate: dayjs.Dayjs,
  ): Promise<TrainingDto[]> {
    const response = await fetch(
      this.withPath(
        `/trainings?start=${startDate.format(
          'YYYY-MM-DD',
        )}&end=${endDate.format('YYYY-MM-DD')}`,
      ),
      {
        method: 'GET',
        headers: {
          ...this.authorizationHeader(),
          Accept: 'application/json',
        },
      },
    );
    const data = await response.json();
    return data.value as TrainingDto[];
  }

  async deleteTraining(id: string): Promise<void> {
    await fetch(this.withPath(`/trainings/${id}`), {
      method: 'DELETE',
      headers: {
        ...this.authorizationHeader(),
        Accept: 'application/json',
      },
    });
  }

  async approveTraining(id: string): Promise<TrainingDto> {
    const response = await fetch(this.withPath(`/trainings/${id}`), {
      method: 'PATCH',
      body: JSON.stringify({ status: 'APPROVED' }),
      headers: {
        ...this.authorizationHeader(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    return (await response.json()) as TrainingDto;
  }

  async unapproveTraining(id: string): Promise<TrainingDto> {
    const response = await fetch(this.withPath(`/trainings/${id}`), {
      method: 'PATCH',
      body: JSON.stringify({ status: 'NEW' }),
      headers: {
        ...this.authorizationHeader(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    return (await response.json()) as TrainingDto;
  }

  async getCompensations(): Promise<Compensation[]> {
    const response = await fetch(this.withPath(`/compensations`), {
      headers: this.authorizationHeader(),
    });
    const result = await response.json();
    return result.value.map((c: CompensationResponse) =>
      this.compensationResponseToCompensation(c),
    );
  }

  async markTrainingsAsCompensated(ids: string[]): Promise<void> {
    await fetch(this.withPath('/trainings'), {
      method: 'PATCH',
      body: JSON.stringify({
        operations: ids.map((id) => ({ id: id, operation: 'SET_COMPENSATED' })),
      }),
      headers: {
        ...this.authorizationHeader(),
        'Content-Type': 'application/json',
      },
    });
  }

  compensationResponseToCompensation(
    response: CompensationResponse,
  ): Compensation {
    return {
      ...response,
      periodStart: dayjs(response.periodStart),
      periodEnd: dayjs(response.periodEnd),
    };
  }

  async getTrainersActiveInPeriod(
    start: dayjs.Dayjs,
    end: dayjs.Dayjs,
  ): Promise<Trainer[]> {
    const startDate = start.format('YYYY-MM-DD');
    const endDate = end.format('YYYY-MM-DD');
    const response = await fetch(
      this.withPath(`/trainers?start=${startDate}&end=${endDate}`),
      { headers: this.authorizationHeader() },
    );
    const trainers = (await response.json()).value;
    return trainers as Trainer[];
  }
}

export interface Compensation {
  correspondingIds: string[];
  user: { id: string; name: string; iban: string };
  totalCompensationCents: number;
  totalTrainings: number;
  periodStart: dayjs.Dayjs;
  periodEnd: dayjs.Dayjs;
}

export interface User {
  id: string;
  iban?: string;
  email: string;
  name: string;
  groups: string[];
}

/** A trainer as returned from the list trainers backend. */
export interface Trainer {
  userId: string;
  userName: string;
  newCount: number;
  approvedCount: number;
  compensatedCount: number;
}
