export const USER_SERVICE = {
    NAME: 'USER_SERVICE', 
    ACTIONS: {
        FIND_ALL_EMPLOYEE: { cmd: 'findAllEmployee' },
        FIND_ONE_EMPLOYEE_BY_ID: { cmd: 'findOneEmployeeById' },
        UPLOAD_EMPLOYEE_AVATAR: { cmd: 'uploadEmployeeAvatar' },
        UPDATE_EMPLOYEE_INFO: { cmd: 'updateEmployeeInfo' },    
        REMOVE_EMPLOYEE_AVATAR: { cmd: 'removeEmployeeAvatar' },
        UPLOAD_EMPLOYEE_RESUME: { cmd: 'uploadEmployeeResume' },
        UPLOAD_EMPLOYEE_COVER_LETTER: { cmd: 'uploadEmployeeCoverLetter' },

        FIND_ALL_COMPANY: { cmd: 'findAllCompany' },
        FIND_ONE_COMPANY_BY_ID: { cmd: 'findOneCompanyById' },
        UPLOAD_COMPANY_AVATAR: { cmd: 'uploadCompanyAvatar' }, 
        UPDATE_COMPANY_INFO: { cmd: 'updateCompanyInfo' },
        REMOVE_COMPANY_AVATAR: { cmd: 'removeCompanyAvatar' },
        UPLOAD_COMPANY_COVER: { cmd: 'uploadCompanyCover' },
        REMOVE_COMPANY_COVER: { cmd: 'removeCompanyCover' },
        
        FIND_ALL: { cmd: 'findAll' },
        FIND_ONE_BY_ID: { cmd: 'findOneById' },
        FIND_ONE_BY_NAME: { cmd: 'findOneByName' },
    }
}