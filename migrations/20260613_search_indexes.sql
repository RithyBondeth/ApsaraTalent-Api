-- Enable pg_trgm extension for ILIKE trigram indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Employee: trigram indexes for ILIKE searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_job_trgm
  ON employee USING gin ("job" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_firstname_trgm
  ON employee USING gin ("firstname" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_lastname_trgm
  ON employee USING gin ("lastname" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_location_trgm
  ON employee USING gin ("location" gin_trgm_ops);

-- Employee: equality column indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_is_hide
  ON employee ("isHide");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_availability
  ON employee ("availability");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_years_of_experience
  ON employee ("yearsOfExperience");

-- Job: trigram indexes for ILIKE searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_title_trgm
  ON job USING gin ("title" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_description_trgm
  ON job USING gin ("description" gin_trgm_ops);

-- Job: equality / range column indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_expire_date
  ON job ("expireDate");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_type
  ON job ("type");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_experience_required
  ON job ("experienceRequired");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_salary_range
  ON job ("salaryMin", "salaryMax");

-- Education degree: trigram for ILIKE
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_education_degree_trgm
  ON education USING gin ("degree" gin_trgm_ops);
