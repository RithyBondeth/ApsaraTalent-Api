const { Project } = require('ts-morph');
const fs = require('fs');
const path = require('path');

const root = '/Users/bondeth/Projects/Apsara Talent/apsaratalent-api';
const project = new Project({
  tsConfigFilePath: path.join(root, 'tsconfig.json')
});

function moveClasses(sourceFilePath, targetFilePath) {
    const sourceFile = project.getSourceFile(sourceFilePath);
    const targetFile = project.getSourceFile(targetFilePath);
    if(!sourceFile) {
        console.log("No source: ", sourceFilePath);
        return;
    }
    if(!targetFile) {
        console.log("No target: ", targetFilePath);
        return;
    }

    // Move classes
    const classes = sourceFile.getClasses();
    classes.forEach(c => {
         targetFile.addClass(c.getStructure());
    });

    // Move imports safely only if missing
    sourceFile.getImportDeclarations().forEach(imp => {
        const impText = imp.getText();
        if(!targetFile.getText().includes(impText)) {
            targetFile.addStatements(impText);
        }
    });

    // delete source file
    sourceFile.delete();
}

// 1. Move Job Responses
moveClasses(
  path.join(root, 'libs/contracts/src/dtos/job/job-response.dto.ts'),
  path.join(root, 'libs/contracts/src/dtos/job/search-job.dto.ts')
);

// 2. Move Resume Responses
moveClasses(
  path.join(root, 'libs/contracts/src/dtos/resume/resume-template-response.dto.ts'),
  path.join(root, 'libs/contracts/src/dtos/resume/create-resume-template.dto.ts')
);

// 3. Move User Responses
moveClasses(
  path.join(root, 'libs/contracts/src/dtos/user/user-response.dto.ts'),
  path.join(root, 'libs/contracts/src/dtos/user/search-employee.dto.ts')
);

// Update barrel exports!
function updateBarrel(dirPath, removedName) {
    const p = path.join(root, 'libs/contracts/src/dtos', dirPath, 'index.ts');
    const f = project.getSourceFile(p);
    if(f) {
        let decls = f.getExportDeclarations();
        decls.forEach(d => {
            if(d.getModuleSpecifierValue() === removedName) {
                d.remove();
            }
        });
    }
}
updateBarrel('job', './job-response.dto');
updateBarrel('resume', './resume-template-response.dto');
updateBarrel('user', './user-response.dto');

// Update internal imports resolving to the removed files!
const sourceFiles = project.getSourceFiles(path.join(root, 'libs/contracts/src/dtos/**/*.ts'));

sourceFiles.forEach(sf => {
    sf.getImportDeclarations().forEach(imp => {
        let mod = imp.getModuleSpecifierValue();
        if(mod === './job-response.dto' || mod === '../job-response.dto') {
            imp.setModuleSpecifier(mod.replace('job-response.dto', 'search-job.dto'));
        }
        if(mod === './resume-template-response.dto' || mod === '../resume-template-response.dto') {
            imp.setModuleSpecifier(mod.replace('resume-template-response.dto', 'create-resume-template.dto'));
        }
        if(mod === './user-response.dto' || mod === '../user-response.dto') {
            imp.setModuleSpecifier(mod.replace('user-response.dto', 'search-employee.dto'));
        }
        if(mod === '../user/user-response.dto') {
            imp.setModuleSpecifier('../user/search-employee.dto'); // for auth verify-otp.dto.ts and login.dto.ts
        }
    });
});

// ADD CONSTRUCTORS GLOBALLY!
sourceFiles.forEach(sf => {
    // Only target classes that end with ResponseDTO
    const classes = sf.getClasses();
    classes.forEach(c => {
        const name = c.getName();
        if(name && name.endsWith('ResponseDTO')) {
            // Check if it already has a constructor
            const constructors = c.getConstructors();
            if(constructors.length === 0) {
                // Determine if it extends something
                const ext = c.getExtends();
                let superCall = ext ? 'super(partial);\n    ' : '';
                
                c.addConstructor({
                    parameters: [{ name: 'partial', type: `Partial<${name}>` }],
                    statements: `${superCall}Object.assign(this, partial);`
                });
            }
        }
    });
});

project.saveSync();
console.log("Teardown8 AST Modifications Complete");
