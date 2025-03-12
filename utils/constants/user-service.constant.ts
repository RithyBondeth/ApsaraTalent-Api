export const USER_SERVICE = {
    NAME: 'USER_SERVICE', 
    ACTIONS: {
        FIND_ALL_EMPLOYEE: { cmd: 'findAllEmployee' },
        FIND_ONE_EMPLOYEE_BYID: { cmd: 'findOneEmployeeById' },
        UPLOAD_EMPLOYEE_AVATAR: { cmd: 'uploadEmployeeAvatar' },
        UPDATE_EMPLOYEE_INFO: { cmd: 'updateEmployeeInfo' },    
        REMOVE_EMPLOYEE_AVATAR: { cmd: 'removeEmployeeAvatar' },

        FIND_ALL_COMPANY: { cmd: 'findAllCompany' },
        FIND_ONE_COMPANY_BYID: { cmd: 'findOneCompanyById' },
        UPLOAD_COMPANY_AVATAR: { cmd: 'uploadCompanyAvatar' }, 
        UPDATE_COMPANY_INFO: { cmd: 'updateCompanyInfo' },
        
        FIND_ALL: { cmd: 'findAll' },
        FIND_ONE_BYID: { cmd: 'findOneById' },
        FIND_ONE_BYNAME: { cmd: 'findOneByName' },
    }
}