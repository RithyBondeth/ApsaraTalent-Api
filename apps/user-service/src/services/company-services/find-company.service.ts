import { Company } from "@app/common/database/entities/company/company.entity";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import { Repository } from "typeorm";
import { UserPaginationDTO } from "../../dtos/user-pagination.dto";

@Injectable()
export class FindCompanyService {
    constructor(
        @InjectRepository(Company) private readonly companyRepository: Repository<Company>,
        private readonly logger: PinoLogger,
    ) {}
 
    async findAll(pagination: UserPaginationDTO) {
       try {
            const companies = await this.companyRepository.find({ 
                relations: [ 'openPositions', 'benefits', 'values', 'careerScopes', 'socials', 'images' ],
                skip: pagination?.skip || 0,
                take: pagination?.limit || 10, 
            });
            if(!companies) throw new NotFoundException('There are no companies available');

            return companies;
       } catch (error) {
            //Handle error
            this.logger.error(error.message);
            throw new BadRequestException("An error occurred while fetching all of the companies");
       }
    }

    async findOneById(companyId: string) {
        try {  
            const company = await this.companyRepository.findOne({ 
                where: { id: companyId },
                relations: ['openPositions', 'benefits', 'values', 'careerScopes', 'socials']
            });
            
            return company;
        } catch (error){
            //Handle error
            this.logger.error(error.message);
            throw new BadRequestException("An error occurred while fetching a company");
        }
    }
}