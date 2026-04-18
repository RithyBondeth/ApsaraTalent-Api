import { CreateInterviewResponseDTO } from './create-interview.dto';

export class GetInterviewResponseDTO extends CreateInterviewResponseDTO {
    constructor(partial: Partial<GetInterviewResponseDTO>) {
        super(partial);
            Object.assign(this, partial);
    }
}
