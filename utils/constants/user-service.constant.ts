export const USER_SERVICE = {
  NAME: 'USER_SERVICE',
  ACTIONS: {
    FIND_ALL_EMPLOYEE: { cmd: 'findAllEmployee' },
    FIND_ONE_EMPLOYEE_BY_ID: { cmd: 'findOneEmployeeById' },
    SEARCH_EMPLOYEES: { cmd: 'searchEmployees' },
    UPLOAD_EMPLOYEE_AVATAR: { cmd: 'uploadEmployeeAvatar' },
    UPDATE_EMPLOYEE_INFO: { cmd: 'updateEmployeeInfo' },
    REMOVE_EMPLOYEE_AVATAR: { cmd: 'removeEmployeeAvatar' },
    UPLOAD_EMPLOYEE_RESUME: { cmd: 'uploadEmployeeResume' },
    REMOVE_EMPLOYEE_RESUME: { cmd: 'removeEmployeeResume' },
    UPLOAD_EMPLOYEE_COVER_LETTER: { cmd: 'uploadEmployeeCoverLetter' },
    REMOVE_EMPLOYEE_COVER_LETTER: { cmd: 'removeEmployeeCoverLetter' },

    FIND_ALL_COMPANY: { cmd: 'findAllCompany' },
    FIND_ONE_COMPANY_BY_ID: { cmd: 'findOneCompanyById' },
    UPLOAD_COMPANY_AVATAR: { cmd: 'uploadCompanyAvatar' },
    UPDATE_COMPANY_INFO: { cmd: 'updateCompanyInfo' },
    REMOVE_COMPANY_AVATAR: { cmd: 'removeCompanyAvatar' },
    UPLOAD_COMPANY_COVER: { cmd: 'uploadCompanyCover' },
    REMOVE_COMPANY_COVER: { cmd: 'removeCompanyCover' },
    UPLOAD_COMPANY_IMAGES: { cmd: 'uploadCompanyImage' },
    REMOVE_COMPANY_IMAGES: { cmd: 'removeCompanyImage' },
    REMOVE_OPEN_POSITION: { cmd: 'removeOpenPosition' },

    FIND_ALL: { cmd: 'findAll' },
    FIND_ONE_BY_ID: { cmd: 'findOneById' },
    FIND_ONE_BY_NAME: { cmd: 'findOneByName' },
    GET_CURRENT_USER: { cmd: 'getCurrentUser' },

    ADD_EMPLOYEE_TO_FAVORITE: { cmd: 'addEmployeeToFavorite' },
    ADD_COMPANY_TO_FAVORITE: { cmd: 'addCompanyToFavorite' },
    FIND_ALL_EMPLOYEE_FAVORITE: { cmd: 'findAllEmployeeFavorite' },
    FIND_ALL_COMPANY_FAVORITE: { cmd: 'findAllCompanyFavorite' },

    FIND_ALL_CAREER_SCOPES: { cmd: 'findAllCareerScopes' },
  },
};
