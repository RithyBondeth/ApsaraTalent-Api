import { CoreResponseDTO, PaginationDTO } from '@app/contracts/dtos/shared';
import {
  CompanyIdDTO,
  CompanyResponseDTO,
  CountAllUsersResponseDTO,
  RemoveCompanyImageDTO,
  RemoveOpenPositionDTO,
  UpdateCompanyInfoDTO,
  UpdateCompanyInfoRequestDTO,
  UpdateCompanyInfoResponseDTO,
  UploadCompanyAvatarDTO,
  UploadCompanyCoverDTO,
  UploadCompanyImagesDTO,
} from '@app/contracts/dtos/user';

export interface IFindCompanyController {
  findAll(paginationDTO: PaginationDTO): Promise<CompanyResponseDTO[]>;
  findOneById(companyId: string): Promise<CompanyResponseDTO>;
  countAllCompanies(): Promise<CountAllUsersResponseDTO>;
}

export interface IFindCompanyRpcController {
  findAll(paginationDTO: PaginationDTO): Promise<CompanyResponseDTO[]>;
  findOneById(companyIdDTO: CompanyIdDTO): Promise<CompanyResponseDTO>;
  countAllCompanies(): Promise<CountAllUsersResponseDTO>;
}

export interface IImageCompanyController {
  uploadCompanyAvatar(
    companyId: string,
    avatar: Express.Multer.File,
  ): Promise<CoreResponseDTO>;
  removeCompanyAvatar(companyId: string): Promise<CoreResponseDTO>;
  uploadCompanyCover(
    companyId: string,
    cover: Express.Multer.File,
  ): Promise<CoreResponseDTO>;
  removeCompanyCover(companyId: string): Promise<CoreResponseDTO>;
  uploadCompanyImages(
    companyId: string,
    images: Express.Multer.File[],
  ): Promise<CoreResponseDTO>;
  removeCompanyImage(
    companyId: string,
    imageId: string,
  ): Promise<CoreResponseDTO>;
}

export interface IImageCompanyRpcController {
  uploadCompanyAvatar(
    uploadCompanyAvatarDTO: UploadCompanyAvatarDTO,
  ): Promise<CoreResponseDTO>;
  removeCompanyAvatar(companyIdDTO: CompanyIdDTO): Promise<CoreResponseDTO>;
  uploadCompanyCover(
    uploadCompanyCoverDTO: UploadCompanyCoverDTO,
  ): Promise<CoreResponseDTO>;
  removeCompanyCover(companyIdDTO: CompanyIdDTO): Promise<CoreResponseDTO>;
  uploadCompanyImages(
    uploadCompanyImagesDTO: UploadCompanyImagesDTO,
  ): Promise<CoreResponseDTO>;
  removeCompanyImage(
    removeCompanyImageDTO: RemoveCompanyImageDTO,
  ): Promise<CoreResponseDTO>;
}

export interface IUpdateCompanyInfoController {
  updateCompanyInfo(
    companyId: string,
    updateCompanyInfoDTO: UpdateCompanyInfoDTO,
  ): Promise<UpdateCompanyInfoResponseDTO>;
}

export interface IUpdateCompanyInfoRpcController {
  updateCompanyInfo(
    updateCompanyInfoRequestDTO: UpdateCompanyInfoRequestDTO,
  ): Promise<UpdateCompanyInfoResponseDTO>;
}

export interface IOpenPositionController {
  removeOpenPosition(companyId: string, opId: string): Promise<CoreResponseDTO>;
}

export interface IOpenPositionRpcController {
  removeOpenPosition(
    removeOpenPositionDTO: RemoveOpenPositionDTO,
  ): Promise<CoreResponseDTO>;
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
