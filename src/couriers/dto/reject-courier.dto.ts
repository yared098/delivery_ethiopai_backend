import { IsString, Length } from 'class-validator';

export class RejectCourierDto {
  @IsString()
  @Length(3, 500)
  reason: string;
}
