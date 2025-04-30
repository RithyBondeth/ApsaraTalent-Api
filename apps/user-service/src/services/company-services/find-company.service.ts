import { Company } from "@app/common/database/entities/company/company.entity";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import { Repository } from "typeorm";
import { UserPaginationDTO } from "../../dtos/user-pagination.dto";
import { CompanyResponseDTO, JobPositionDTO } from "../../dtos/user-response.dto";

@Injectable()
export class FindCompanyService {
    constructor(
        @InjectRepository(Company) private readonly companyRepository: Repository<Company>,
        private readonly logger: PinoLogger,
    ) {}
 
    async findAll(pagination: UserPaginationDTO): Promise<CompanyResponseDTO[]> {
       try {
            const companies = await this.companyRepository.find({ 
                relations: [ 'openPositions', 'benefits', 'values', 'careerScopes', 'socials', 'images' ],
                skip: pagination?.skip || 0,
                take: pagination?.limit || 10, 
            });
            if(!companies) throw new NotFoundException('There are no companies available');

            return companies.map((company) => {
                const transformedCompany = {
                    ...company,
                    openPositions: company.openPositions?.map((job) => new JobPositionDTO(job))
                };
                return new CompanyResponseDTO(transformedCompany);
            });
       } catch (error) {
            //Handle error
            this.logger.error(error.message);
            throw new BadRequestException("An error occurred while fetching all of the companies");
       }
    }

    async findOneById(companyId: string): Promise<CompanyResponseDTO> {
        try {  
            const company = await this.companyRepository.findOne({ 
                where: { id: companyId },
                relations: ['openPositions', 'benefits', 'values', 'careerScopes', 'socials']
            });
            
            return new CompanyResponseDTO({
                ...company,
                openPositions: company.openPositions?.map((job) => new JobPositionDTO(job))
            });
        } catch (error){
            //Handle error
            this.logger.error(error.message);
            throw new BadRequestException("An error occurred while fetching a company");
        }
    }
}