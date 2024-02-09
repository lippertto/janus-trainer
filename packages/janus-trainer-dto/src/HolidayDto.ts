export type HolidayDto = {
  start: string;
  end: string;
  name: string;
  id: string;
};

export type HolidayListDto = {
  value: HolidayDto[];
};
