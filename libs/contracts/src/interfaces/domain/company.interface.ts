import { CoreResponseDTO, PaginationDTO } from '../../dtos/shared';
import {
  CompanyIdDTO,
  CompanyResponseDTO,
  RemoveCompanyImageDTO,
  RemoveOpenPositionDTO,
  UpdateCompanyInfoDTO,
  UpdateCompanyInfoRequestDTO,
  UpdateCompanyInfoResponseDTO,
  UploadCompanyAvatarDTO,
  UploadCompanyCoverDTO,
  UploadCompanyImagesDTO,
} from '../../dtos/user';
import { CountAllUsersResponseDTO } from '../../dtos/user';

export interface IFindCompanyController {
  findAll(data: PaginationDTO): Promise<CompanyResponseDTO[]>;
  findOneById(data: string): Promise<CompanyResponseDTO>;
  countAllCompanies(): Promise<CountAllUsersResponseDTO>;
}

export interface IFindCompanyRpcController {
  findAll(data: PaginationDTO): Promise<CompanyResponseDTO[]>;
  findOneById(data: CompanyIdDTO): Promise<CompanyResponseDTO>;
  countAllCompanies(): Promise<CountAllUsersResponseDTO>;
}

export interface IImageCompanyController {
  uploadCompanyAvatar(
    companyId: string,
    file: Express.Multer.File,
  ): Promise<CoreResponseDTO>;
  removeCompanyAvatar(companyId: string): Promise<CoreResponseDTO>;
  uploadCompanyCover(
    companyId: string,
    file: Express.Multer.File,
  ): Promise<CoreResponseDTO>;
  removeCompanyCover(companyId: string): Promise<CoreResponseDTO>;
  uploadCompanyImages(
    companyId: string,
    file: Express.Multer.File[],
  ): Promise<CoreResponseDTO>;
  removeCompanyImage(
    companyId: string,
    imageId: string,
  ): Promise<CoreResponseDTO>;
}

export interface IImageCompanyRpcController {
  uploadCompanyAvatar(data: UploadCompanyAvatarDTO): Promise<CoreResponseDTO>;
  removeCompanyAvatar(data: CompanyIdDTO): Promise<CoreResponseDTO>;
  uploadCompanyCover(data: UploadCompanyCoverDTO): Promise<CoreResponseDTO>;
  removeCompanyCover(data: CompanyIdDTO): Promise<CoreResponseDTO>;
  uploadCompanyImages(data: UploadCompanyImagesDTO): Promise<CoreResponseDTO>;
  removeCompanyImage(data: RemoveCompanyImageDTO): Promise<CoreResponseDTO>;
}

export interface IUpdateCompanyInfoController {
  updateCompanyInfo(
    companyId: string,
    body: UpdateCompanyInfoDTO,
  ): Promise<UpdateCompanyInfoResponseDTO>;
}

export interface IUpdateCompanyInfoRpcController {
  updateCompanyInfo(
    data: UpdateCompanyInfoRequestDTO,
  ): Promise<UpdateCompanyInfoResponseDTO>;
}

export interface IOpenPositionController {
  removeOpenPosition(companyId: string, opId: string): Promise<CoreResponseDTO>;
}

export interface IOpenPositionRpcController {
  removeOpenPosition(data: RemoveOpenPositionDTO): Promise<CoreResponseDTO>;
}

export interface ICompanyController
  extends
    IFindCompanyController,
    IImageCompanyController,
    IUpdateCompanyInfoController,
    IOpenPositionController {}

export interface ICompanyRpcController
  extends
    IFindCompanyRpcController,
    IImageCompanyRpcController,
    IUpdateCompanyInfoRpcController,
    IOpenPositionRpcController {}
