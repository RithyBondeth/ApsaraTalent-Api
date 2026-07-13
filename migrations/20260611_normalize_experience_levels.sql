-- Normalize legacy experience level strings to the current canonical set:
--   'No Experience' | 'Less than 1 year' | '1 - 2 years' | '3 - 5 years' | '6 - 10 years' | '10+ years'
--
-- employee.yearsOfExperience
UPDATE employee
SET "yearsOfExperience" = '1 - 2 years'
WHERE "yearsOfExperience" IN ('1+ year', '1 - 3 years', '2+ years');

UPDATE employee
SET "yearsOfExperience" = '3 - 5 years'
WHERE "yearsOfExperience" = 'More than 2 years';

UPDATE employee
SET "yearsOfExperience" = '6 - 10 years'
WHERE "yearsOfExperience" = '5 - 10 years';

-- job.experienceRequired
UPDATE job
SET "experienceRequired" = '1 - 2 years'
WHERE "experienceRequired" IN ('1+ year', '1 - 3 years', '2+ years');

UPDATE job
SET "experienceRequired" = '3 - 5 years'
WHERE "experienceRequired" = 'More than 2 years';

UPDATE job
SET "experienceRequired" = '6 - 10 years'
WHERE "experienceRequired" = '5 - 10 years';
