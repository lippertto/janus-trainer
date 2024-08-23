import { CompensationClassCreateRequest, CompensationClassDto } from '@/lib/dto';
import prisma from '@/lib/prisma';
import { CompensationClass } from '@prisma/client';


export async function createCompensationClass(request: CompensationClassCreateRequest): Promise<CompensationClassDto> {
  const created =  await prisma.compensationClass.create({
    data: {
      name: request.name,
    },
  });
  return {...created, compensationValues: []}
}