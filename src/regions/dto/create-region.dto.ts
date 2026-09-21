import { IsString, Length, Matches } from 'class-validator';

export class CreateRegionDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(2, 5)
  @Matches(/^[A-Z]+$/, { message: 'Code must be uppercase letters (e.g. OR, AM)' })
  code: string;
}
