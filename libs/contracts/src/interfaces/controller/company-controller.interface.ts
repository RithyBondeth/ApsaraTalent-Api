import { PaginationDTO } from '@app/contracts/dtos/shared';
import {
  CompanyIdDTO,
  CompanyResponseDTO,
  CountAllUsersResponseDTO,
  RemoveCompanyImageDTO,
  RemoveCompanyImageResponseDTO,
  RemoveCompanyAvatarResponseDTO,
  RemoveCompanyCoverResponseDTO,
  RemoveOpenPositionDTO,
  RemoveOpenPositionResponseDTO,
  UpdateCompanyInfoDTO,
  UpdateCompanyInfoRequestDTO,
  UpdateCompanyInfoResponseDTO,
  UploadCompanyAvatarDTO,
  UploadCompanyAvatarResponseDTO,
  UploadCompanyCoverDTO,
  UploadCompanyCoverResponseDTO,
  UploadCompanyImagesDTO,
  UploadCompanyImagesResponseDTO,
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
  ): Promise<UploadCompanyAvatarResponseDTO>;
  removeCompanyAvatar(companyId: string): Promise<RemoveCompanyAvatarResponseDTO>;
  uploadCompanyCover(
    companyId: string,
    cover: Express.Multer.File,
  ): Promise<UploadCompanyCoverResponseDTO>;
  removeCompanyCover(companyId: string): Promise<RemoveCompanyCoverResponseDTO>;
  uploadCompanyImages(
    companyId: string,
    images: Express.Multer.File[],
  ): Promise<UploadCompanyImagesResponseDTO>;
  removeCompanyImage(
    companyId: string,
    imageId: string,
  ): Promise<RemoveCompanyImageResponseDTO>;
}

export interface IImageCompanyRpcController {
  uploadCompanyAvatar(
    uploadCompanyAvatarDTO: UploadCompanyAvatarDTO,
  ): Promise<UploadCompanyAvatarResponseDTO>;
  removeCompanyAvatar(companyIdDTO: CompanyIdDTO): Promise<RemoveCompanyAvatarResponseDTO>;
  uploadCompanyCover(
    uploadCompanyCoverDTO: UploadCompanyCoverDTO,
  ): Promise<UploadCompanyCoverResponseDTO>;
  removeCompanyCover(companyIdDTO: CompanyIdDTO): Promise<RemoveCompanyCoverResponseDTO>;
  uploadCompanyImages(
    uploadCompanyImagesDTO: UploadCompanyImagesDTO,
  ): Promise<UploadCompanyImagesResponseDTO>;
  removeCompanyImage(
    removeCompanyImageDTO: RemoveCompanyImageDTO,
  ): Promise<RemoveCompanyImageResponseDTO>;
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
  removeOpenPosition(companyId: string, opId: string): Promise<RemoveOpenPositionResponseDTO>;
}

export interface IOpenPositionRpcController {
  removeOpenPosition(
    removeOpenPositionDTO: RemoveOpenPositionDTO,
  ): Promise<RemoveOpenPositionResponseDTO>;
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
