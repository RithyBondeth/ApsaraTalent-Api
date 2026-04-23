/**
 * Database Seed Script
 * Creates fake Cambodian employees and companies for development/testing.
 *
 * Run: npm run seed
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource, In } from 'typeorm';
import { CareerScope } from '@app/common/database/entities/career-scope.entity';
import { Benefit } from '@app/common/database/entities/company/benefit.entity';
import { Company } from '@app/common/database/entities/company/company.entity';
import { Job } from '@app/common/database/entities/company/job.entity';
import { Value } from '@app/common/database/entities/company/value.entity';
import { Image } from '@app/common/database/entities/company/image.entity';
import { CompanyFavoriteEmployee } from '@app/common/database/entities/company/favorite-employee.entity';
import { Education } from '@app/common/database/entities/employee/education.entity';
import { Employee } from '@app/common/database/entities/employee/employee.entity';
import { Experience } from '@app/common/database/entities/employee/experience.entity';
import { Skill } from '@app/common/database/entities/employee/skill.entity';
import { EmployeeFavoriteCompany } from '@app/common/database/entities/employee/favorite-company.entity';
import { Social } from '@app/common/database/entities/social.entity';
import { User } from '@app/common/database/entities/user.entity';
import { Chat } from '@app/common/database/entities/chat.entity';
import { JobMatching } from '@app/common/database/entities/job-matching.entity';
import { Notification } from '@app/common/database/entities/notification.entity';
import { ResumeTemplate } from '@app/common/database/entities/resume-template.entity';
import { Interview } from '@app/common/database/entities/interview.entity';
import { EUserRole } from '@app/common/database/enums/user-role.enum';
import { EGender } from '@app/common/database/enums/gender.enum';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── Seed Data ────────────────────────────────────────────────────────────────

const CAREER_SCOPES = [
  'Software Development',
  'Marketing & Advertising',
  'Finance & Accounting',
  'Human Resources',
  'Design & Creative',
  'Operations & Management',
  'Sales & Business Development',
  'Engineering & Technology',
  'Healthcare',
  'Education & Training',
];

const SKILLS_DATA = [
  { name: 'JavaScript', description: 'Web programming language' },
  { name: 'Python', description: 'General-purpose programming language' },
  { name: 'React', description: 'Frontend UI library' },
  { name: 'Node.js', description: 'Server-side JavaScript runtime' },
  { name: 'TypeScript', description: 'Typed superset of JavaScript' },
  { name: 'Digital Marketing', description: 'Online marketing strategies' },
  { name: 'SEO', description: 'Search engine optimization' },
  { name: 'Content Writing', description: 'Creating written content' },
  { name: 'Financial Analysis', description: 'Analyzing financial data' },
  { name: 'Accounting', description: 'Financial record keeping' },
  { name: 'UI/UX Design', description: 'User interface and experience design' },
  { name: 'Figma', description: 'Design and prototyping tool' },
  { name: 'Project Management', description: 'Planning and executing projects' },
  { name: 'Agile', description: 'Iterative project methodology' },
  { name: 'SQL', description: 'Relational database query language' },
  { name: 'Photoshop', description: 'Adobe image editing software' },
  { name: 'Sales', description: 'Sales and negotiation skills' },
  { name: 'Customer Service', description: 'Client support and relations' },
  { name: 'Excel', description: 'Microsoft spreadsheet software' },
  { name: 'Communication', description: 'Verbal and written communication' },
];

const BENEFITS = [
  'Health Insurance',
  'Annual Bonus',
  'Flexible Hours',
  'Remote Work',
  'Training & Development',
  'Meal Allowance',
  'Transportation Allowance',
  'Annual Leave (18 days)',
  'Life Insurance',
  'Stock Options',
];

const VALUES = [
  'Innovation',
  'Integrity',
  'Teamwork',
  'Customer First',
  'Diversity & Inclusion',
  'Sustainability',
  'Excellence',
  'Growth Mindset',
];

const CAMBODIAN_LOCATIONS = [
  'Phnom Penh',
  'Siem Reap',
  'Battambang',
  'Sihanoukville',
  'Kampong Cham',
];

const EMPLOYEES_DATA = [
  {
    firstname: 'Sophea',
    lastname: 'Chan',
    username: 'sophea_chan',
    gender: EGender.FEMALE,
    dob: new Date('1998-04-12'),
    job: 'Frontend Developer',
    yearsOfExperience: '3 years',
    availability: 'available',
    location: 'Phnom Penh',
    phone: '+85512000001',
    email: 'sophea.chan@seed.dev',
    description:
      'Passionate frontend developer with experience in React and TypeScript. Love building beautiful, responsive UIs.',
    careerScopes: ['Software Development', 'Design & Creative'],
    skills: ['React', 'TypeScript', 'JavaScript', 'Figma'],
    educations: [
      {
        school: 'Royal University of Phnom Penh',
        degree: 'Bachelor of Computer Science',
        year: '2020',
      },
    ],
    experiences: [
      {
        title: 'Junior Frontend Developer',
        description: 'Developed web applications using React and CSS.',
        startDate: new Date('2020-06-01'),
        endDate: new Date('2022-05-31'),
      },
      {
        title: 'Frontend Developer',
        description: 'Led UI development for fintech products.',
        startDate: new Date('2022-06-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Dara',
    lastname: 'Kem',
    username: 'dara_kem',
    gender: EGender.MALE,
    dob: new Date('1995-08-20'),
    job: 'Backend Engineer',
    yearsOfExperience: '5 years',
    availability: 'available',
    location: 'Phnom Penh',
    phone: '+85512000002',
    email: 'dara.kem@seed.dev',
    description:
      'Backend engineer specializing in Node.js microservices and PostgreSQL. Experienced in building scalable APIs.',
    careerScopes: ['Software Development', 'Engineering & Technology'],
    skills: ['Node.js', 'Python', 'SQL', 'TypeScript'],
    educations: [
      {
        school: 'Institute of Technology of Cambodia',
        degree: 'Bachelor of Information Technology',
        year: '2017',
      },
    ],
    experiences: [
      {
        title: 'Software Engineer',
        description: 'Built REST APIs and microservices for e-commerce platforms.',
        startDate: new Date('2018-01-01'),
        endDate: new Date('2021-12-31'),
      },
      {
        title: 'Senior Backend Engineer',
        description: 'Led backend architecture for a fintech startup.',
        startDate: new Date('2022-01-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Bopha',
    lastname: 'Sok',
    username: 'bopha_sok',
    gender: EGender.FEMALE,
    dob: new Date('2000-01-15'),
    job: 'Digital Marketing Specialist',
    yearsOfExperience: '2 years',
    availability: 'available',
    location: 'Siem Reap',
    phone: '+85512000003',
    email: 'bopha.sok@seed.dev',
    description:
      'Creative digital marketer with a strong background in social media strategy and content creation.',
    careerScopes: ['Marketing & Advertising', 'Sales & Business Development'],
    skills: ['Digital Marketing', 'SEO', 'Content Writing', 'Communication'],
    educations: [
      {
        school: 'Pannasastra University of Cambodia',
        degree: 'Bachelor of Business Administration',
        year: '2022',
      },
    ],
    experiences: [
      {
        title: 'Marketing Coordinator',
        description: 'Managed social media accounts and ran paid ad campaigns.',
        startDate: new Date('2022-07-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Ratha',
    lastname: 'Lim',
    username: 'ratha_lim',
    gender: EGender.MALE,
    dob: new Date('1993-11-05'),
    job: 'Financial Analyst',
    yearsOfExperience: '7 years',
    availability: 'available',
    location: 'Phnom Penh',
    phone: '+85512000004',
    email: 'ratha.lim@seed.dev',
    description:
      'Senior financial analyst with deep expertise in investment analysis and financial modeling for Southeast Asian markets.',
    careerScopes: ['Finance & Accounting', 'Operations & Management'],
    skills: ['Financial Analysis', 'Excel', 'Accounting', 'SQL'],
    educations: [
      {
        school: 'National University of Management',
        degree: 'Master of Finance',
        year: '2017',
      },
    ],
    experiences: [
      {
        title: 'Financial Analyst',
        description: 'Conducted investment analysis and market research.',
        startDate: new Date('2017-03-01'),
        endDate: new Date('2020-08-31'),
      },
      {
        title: 'Senior Financial Analyst',
        description: 'Led financial planning and analysis for regional operations.',
        startDate: new Date('2020-09-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Kosal',
    lastname: 'Pich',
    username: 'kosal_pich',
    gender: EGender.MALE,
    dob: new Date('1997-03-22'),
    job: 'UI/UX Designer',
    yearsOfExperience: '4 years',
    availability: 'available',
    location: 'Phnom Penh',
    phone: '+85512000005',
    email: 'kosal.pich@seed.dev',
    description:
      'Product designer passionate about creating user-centered digital experiences. Skilled in Figma and design systems.',
    careerScopes: ['Design & Creative', 'Software Development'],
    skills: ['UI/UX Design', 'Figma', 'Photoshop', 'JavaScript'],
    educations: [
      {
        school: 'Zaman University',
        degree: 'Bachelor of Multimedia Design',
        year: '2019',
      },
    ],
    experiences: [
      {
        title: 'UI Designer',
        description: 'Designed mobile app interfaces for local startups.',
        startDate: new Date('2019-09-01'),
        endDate: new Date('2022-01-31'),
      },
      {
        title: 'Product Designer',
        description: 'Led end-to-end product design for a SaaS platform.',
        startDate: new Date('2022-02-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Maly',
    lastname: 'Heng',
    username: 'maly_heng',
    gender: EGender.FEMALE,
    dob: new Date('1999-06-18'),
    job: 'HR Specialist',
    yearsOfExperience: '3 years',
    availability: 'available',
    location: 'Battambang',
    phone: '+85512000006',
    email: 'maly.heng@seed.dev',
    description:
      'HR professional focused on talent acquisition and employee engagement. Experienced in full-cycle recruitment.',
    careerScopes: ['Human Resources', 'Operations & Management'],
    skills: ['Communication', 'Customer Service', 'Excel', 'Project Management'],
    educations: [
      {
        school: 'Royal University of Law and Economics',
        degree: 'Bachelor of Human Resource Management',
        year: '2021',
      },
    ],
    experiences: [
      {
        title: 'HR Associate',
        description: 'Handled recruitment and onboarding for tech roles.',
        startDate: new Date('2021-08-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Chenda',
    lastname: 'Nhem',
    username: 'chenda_nhem',
    gender: EGender.FEMALE,
    dob: new Date('1996-09-30'),
    job: 'Sales Manager',
    yearsOfExperience: '5 years',
    availability: 'available',
    location: 'Phnom Penh',
    phone: '+85512000007',
    email: 'chenda.nhem@seed.dev',
    description:
      'Results-driven sales manager with a track record of exceeding revenue targets in SaaS and B2B markets.',
    careerScopes: ['Sales & Business Development', 'Marketing & Advertising'],
    skills: ['Sales', 'Communication', 'Customer Service', 'Digital Marketing'],
    educations: [
      {
        school: 'Build Bright University',
        degree: 'Bachelor of Business Management',
        year: '2018',
      },
    ],
    experiences: [
      {
        title: 'Sales Representative',
        description: 'Managed B2B accounts and grew regional revenue by 30%.',
        startDate: new Date('2018-05-01'),
        endDate: new Date('2021-04-30'),
      },
      {
        title: 'Sales Manager',
        description: 'Led a team of 8 sales reps across Cambodia.',
        startDate: new Date('2021-05-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Virak',
    lastname: 'Tep',
    username: 'virak_tep',
    gender: EGender.MALE,
    dob: new Date('1994-12-08'),
    job: 'DevOps Engineer',
    yearsOfExperience: '6 years',
    availability: 'available',
    location: 'Phnom Penh',
    phone: '+85512000008',
    email: 'virak.tep@seed.dev',
    description:
      'DevOps engineer specializing in CI/CD pipelines, cloud infrastructure, and container orchestration.',
    careerScopes: ['Engineering & Technology', 'Software Development'],
    skills: ['Python', 'SQL', 'Node.js', 'Agile'],
    educations: [
      {
        school: 'Institute of Technology of Cambodia',
        degree: 'Bachelor of Computer Engineering',
        year: '2016',
      },
    ],
    experiences: [
      {
        title: 'Systems Administrator',
        description: 'Managed on-premise servers and network infrastructure.',
        startDate: new Date('2016-07-01'),
        endDate: new Date('2019-06-30'),
      },
      {
        title: 'DevOps Engineer',
        description: 'Built and maintained CI/CD pipelines and Kubernetes clusters.',
        startDate: new Date('2019-07-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Sokha',
    lastname: 'Mean',
    username: 'sokha_mean',
    gender: EGender.FEMALE,
    dob: new Date('2001-05-25'),
    job: 'Content Creator',
    yearsOfExperience: '1 year',
    availability: 'available',
    location: 'Siem Reap',
    phone: '+85512000009',
    email: 'sokha.mean@seed.dev',
    description:
      'Creative content creator and social media strategist with a passion for storytelling and brand building.',
    careerScopes: ['Marketing & Advertising', 'Design & Creative'],
    skills: ['Content Writing', 'SEO', 'Photoshop', 'Communication'],
    educations: [
      {
        school: 'Pannasastra University of Cambodia',
        degree: 'Bachelor of Media & Communication',
        year: '2023',
      },
    ],
    experiences: [
      {
        title: 'Content Creator Intern',
        description: 'Created blog posts and social media content for a tourism brand.',
        startDate: new Date('2023-06-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Piseth',
    lastname: 'Kong',
    username: 'piseth_kong',
    gender: EGender.MALE,
    dob: new Date('1992-07-14'),
    job: 'Project Manager',
    yearsOfExperience: '8 years',
    availability: 'available',
    location: 'Phnom Penh',
    phone: '+85512000010',
    email: 'piseth.kong@seed.dev',
    description:
      'Experienced project manager with a PMP certification. Led cross-functional teams to deliver complex tech projects on time.',
    careerScopes: ['Operations & Management', 'Engineering & Technology'],
    skills: ['Project Management', 'Agile', 'Communication', 'Excel'],
    educations: [
      {
        school: 'National University of Management',
        degree: 'Master of Business Administration',
        year: '2016',
      },
    ],
    experiences: [
      {
        title: 'Project Coordinator',
        description: 'Coordinated IT infrastructure projects for the banking sector.',
        startDate: new Date('2015-09-01'),
        endDate: new Date('2019-08-31'),
      },
      {
        title: 'Senior Project Manager',
        description: 'Managed $2M+ digital transformation projects.',
        startDate: new Date('2019-09-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Sreymom',
    lastname: 'Yun',
    username: 'sreymom_yun',
    gender: EGender.FEMALE,
    dob: new Date('1998-02-28'),
    job: 'Accountant',
    yearsOfExperience: '3 years',
    availability: 'available',
    location: 'Kampong Cham',
    phone: '+85512000011',
    email: 'sreymom.yun@seed.dev',
    description:
      'Certified accountant proficient in IFRS and local Cambodia accounting standards. Detail-oriented and reliable.',
    careerScopes: ['Finance & Accounting'],
    skills: ['Accounting', 'Excel', 'Financial Analysis', 'Communication'],
    educations: [
      {
        school: 'National University of Management',
        degree: 'Bachelor of Accounting',
        year: '2020',
      },
    ],
    experiences: [
      {
        title: 'Junior Accountant',
        description: 'Prepared financial reports and tax filings for SMEs.',
        startDate: new Date('2020-10-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Bunthoeun',
    lastname: 'Or',
    username: 'bunthoeun_or',
    gender: EGender.MALE,
    dob: new Date('1990-10-03'),
    job: 'Software Architect',
    yearsOfExperience: '10 years',
    availability: 'available',
    location: 'Phnom Penh',
    phone: '+85512000012',
    email: 'bunthoeun.or@seed.dev',
    description:
      'Software architect with a decade of experience designing enterprise-grade distributed systems for Southeast Asian markets.',
    careerScopes: ['Software Development', 'Engineering & Technology', 'Operations & Management'],
    skills: ['TypeScript', 'Python', 'SQL', 'Agile', 'Project Management'],
    educations: [
      {
        school: 'Institute of Technology of Cambodia',
        degree: 'Master of Computer Science',
        year: '2014',
      },
    ],
    experiences: [
      {
        title: 'Senior Developer',
        description: 'Built core banking systems and payment integrations.',
        startDate: new Date('2014-03-01'),
        endDate: new Date('2019-02-28'),
      },
      {
        title: 'Software Architect',
        description: 'Designed microservices architecture for a fintech platform serving 500K+ users.',
        startDate: new Date('2019-03-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Chanthy',
    lastname: 'Seng',
    username: 'chanthy_seng',
    gender: EGender.FEMALE,
    dob: new Date('2000-08-11'),
    job: 'Graphic Designer',
    yearsOfExperience: '2 years',
    availability: 'available',
    location: 'Battambang',
    phone: '+85512000013',
    email: 'chanthy.seng@seed.dev',
    description:
      'Creative graphic designer specializing in brand identity, print, and digital media. Passionate about visual storytelling.',
    careerScopes: ['Design & Creative', 'Marketing & Advertising'],
    skills: ['Photoshop', 'Figma', 'UI/UX Design', 'Content Writing'],
    educations: [
      {
        school: 'Zaman University',
        degree: 'Bachelor of Fine Arts',
        year: '2022',
      },
    ],
    experiences: [
      {
        title: 'Graphic Designer',
        description: 'Created brand assets for NGOs and local businesses.',
        startDate: new Date('2022-06-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Makara',
    lastname: 'Chhun',
    username: 'makara_chhun',
    gender: EGender.MALE,
    dob: new Date('1991-04-17'),
    job: 'Healthcare Consultant',
    yearsOfExperience: '9 years',
    availability: 'available',
    location: 'Phnom Penh',
    phone: '+85512000014',
    email: 'makara.chhun@seed.dev',
    description:
      'Healthcare consultant with expertise in hospital operations, health policy, and digital health transformation across Cambodia.',
    careerScopes: ['Healthcare', 'Operations & Management'],
    skills: ['Communication', 'Project Management', 'Excel', 'Customer Service'],
    educations: [
      {
        school: 'University of Health Sciences',
        degree: 'Bachelor of Public Health',
        year: '2013',
      },
    ],
    experiences: [
      {
        title: 'Health Coordinator',
        description: 'Managed community health programs in rural provinces.',
        startDate: new Date('2013-08-01'),
        endDate: new Date('2018-07-31'),
      },
      {
        title: 'Healthcare Consultant',
        description: 'Advised hospitals on operational efficiency and digitization.',
        startDate: new Date('2018-08-01'),
        endDate: null,
      },
    ],
  },
  {
    firstname: 'Sokunthea',
    lastname: 'Ly',
    username: 'sokunthea_ly',
    gender: EGender.FEMALE,
    dob: new Date('1994-12-01'),
    job: 'Training Specialist',
    yearsOfExperience: '6 years',
    availability: 'available',
    location: 'Sihanoukville',
    phone: '+85512000015',
    email: 'sokunthea.ly@seed.dev',
    description:
      'L&D professional designing and delivering training programs for corporate clients. Certified in instructional design.',
    careerScopes: ['Education & Training', 'Human Resources'],
    skills: ['Communication', 'Project Management', 'Content Writing', 'Excel'],
    educations: [
      {
        school: 'Royal University of Phnom Penh',
        degree: 'Bachelor of Education',
        year: '2016',
      },
    ],
    experiences: [
      {
        title: 'Corporate Trainer',
        description: 'Delivered soft-skills and technical training for banking staff.',
        startDate: new Date('2017-01-01'),
        endDate: new Date('2020-12-31'),
      },
      {
        title: 'Training & Development Specialist',
        description: 'Designed e-learning programs for a multinational company.',
        startDate: new Date('2021-01-01'),
        endDate: null,
      },
    ],
  },
];

const COMPANIES_DATA = [
  {
    name: 'Sabay Digital',
    email: 'hr@sabay-seed.dev',
    phone: '+85523000001',
    industry: 'Technology',
    location: 'Phnom Penh',
    companySize: 250,
    foundedYear: 2008,
    description:
      'Cambodia\'s leading digital media and technology company, operating gaming, entertainment, and payment platforms.',
    careerScopes: ['Software Development', 'Marketing & Advertising', 'Design & Creative'],
    benefits: ['Health Insurance', 'Annual Bonus', 'Training & Development', 'Flexible Hours'],
    values: ['Innovation', 'Teamwork', 'Growth Mindset'],
    jobs: [
      {
        title: 'React Developer',
        description: 'Build and maintain our consumer-facing web applications.',
        type: 'Full-time',
        experienceRequired: '2+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'React,JavaScript,TypeScript',
        salary: '$800 - $1,500/month',
      },
      {
        title: 'Digital Marketing Manager',
        description: 'Lead digital marketing campaigns across social and search channels.',
        type: 'Full-time',
        experienceRequired: '3+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'Digital Marketing,SEO,Content Writing',
        salary: '$700 - $1,200/month',
      },
    ],
  },
  {
    name: 'Wing Bank',
    email: 'careers@wingbank-seed.dev',
    phone: '+85523000002',
    industry: 'Financial Services',
    location: 'Phnom Penh',
    companySize: 500,
    foundedYear: 2008,
    description:
      'Wing Bank is Cambodia\'s first fully licensed digital bank, serving millions of customers with mobile-first financial services.',
    careerScopes: ['Finance & Accounting', 'Software Development', 'Operations & Management'],
    benefits: ['Health Insurance', 'Annual Bonus', 'Life Insurance', 'Annual Leave (18 days)'],
    values: ['Integrity', 'Customer First', 'Excellence'],
    jobs: [
      {
        title: 'Senior Financial Analyst',
        description: 'Conduct financial modeling and investment analysis for new products.',
        type: 'Full-time',
        experienceRequired: '4+ years',
        educationRequired: "Master's degree",
        skillsRequired: 'Financial Analysis,Excel,Accounting,SQL',
        salary: '$1,200 - $2,000/month',
      },
      {
        title: 'Backend Developer',
        description: 'Develop APIs and microservices for our mobile banking platform.',
        type: 'Full-time',
        experienceRequired: '3+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'Node.js,Python,SQL,TypeScript',
        salary: '$900 - $1,600/month',
      },
    ],
  },
  {
    name: 'Cellcard Cambodia',
    email: 'talent@cellcard-seed.dev',
    phone: '+85523000003',
    industry: 'Telecommunications',
    location: 'Phnom Penh',
    companySize: 1200,
    foundedYear: 1996,
    description:
      'Cellcard is one of Cambodia\'s leading mobile operators, providing nationwide 4G/5G connectivity and digital services.',
    careerScopes: ['Engineering & Technology', 'Sales & Business Development', 'Marketing & Advertising'],
    benefits: ['Health Insurance', 'Transportation Allowance', 'Meal Allowance', 'Annual Bonus', 'Training & Development'],
    values: ['Innovation', 'Customer First', 'Teamwork'],
    jobs: [
      {
        title: 'Network Engineer',
        description: 'Design and maintain our 4G/5G radio access network.',
        type: 'Full-time',
        experienceRequired: '3+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'Communication,Project Management,Agile',
        salary: '$800 - $1,400/month',
      },
      {
        title: 'B2B Sales Executive',
        description: 'Grow enterprise accounts and drive corporate solutions revenue.',
        type: 'Full-time',
        experienceRequired: '2+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'Sales,Communication,Customer Service',
        salary: '$600 - $1,000/month + commission',
      },
    ],
  },
  {
    name: 'Smart Axiata',
    email: 'jobs@smartaxiata-seed.dev',
    phone: '+85523000004',
    industry: 'Telecommunications',
    location: 'Phnom Penh',
    companySize: 800,
    foundedYear: 1996,
    description:
      'Smart Axiata is Cambodia\'s #1 mobile operator providing 4G and Smart Broadband services to over 8 million subscribers.',
    careerScopes: ['Software Development', 'Engineering & Technology', 'Marketing & Advertising'],
    benefits: ['Health Insurance', 'Annual Bonus', 'Stock Options', 'Remote Work', 'Flexible Hours'],
    values: ['Innovation', 'Excellence', 'Diversity & Inclusion'],
    jobs: [
      {
        title: 'Full Stack Developer',
        description: 'Build internal platforms and customer-facing digital products.',
        type: 'Full-time',
        experienceRequired: '3+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'React,Node.js,TypeScript,SQL',
        salary: '$1,000 - $1,800/month',
      },
    ],
  },
  {
    name: 'ACLEDA Bank',
    email: 'hr@acleda-seed.dev',
    phone: '+85523000005',
    industry: 'Banking',
    location: 'Phnom Penh',
    companySize: 3000,
    foundedYear: 1993,
    description:
      'ACLEDA Bank is Cambodia\'s largest commercial bank, with a nationwide branch network serving individuals and SMEs.',
    careerScopes: ['Finance & Accounting', 'Operations & Management', 'Human Resources'],
    benefits: ['Health Insurance', 'Annual Bonus', 'Life Insurance', 'Annual Leave (18 days)', 'Training & Development'],
    values: ['Integrity', 'Customer First', 'Excellence', 'Teamwork'],
    jobs: [
      {
        title: 'Accountant',
        description: 'Manage financial records and produce reports per IFRS standards.',
        type: 'Full-time',
        experienceRequired: '2+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'Accounting,Excel,Financial Analysis',
        salary: '$500 - $900/month',
      },
      {
        title: 'HR Business Partner',
        description: 'Support talent acquisition and organizational development.',
        type: 'Full-time',
        experienceRequired: '3+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'Communication,Excel,Project Management',
        salary: '$600 - $1,100/month',
      },
    ],
  },
  {
    name: 'Mekong Strategic Partners',
    email: 'careers@mekongsp-seed.dev',
    phone: '+85523000006',
    industry: 'Consulting',
    location: 'Phnom Penh',
    companySize: 80,
    foundedYear: 2010,
    description:
      'Boutique consulting firm specializing in market entry, strategy, and digital transformation for companies operating across the Mekong region.',
    careerScopes: ['Operations & Management', 'Finance & Accounting', 'Sales & Business Development'],
    benefits: ['Flexible Hours', 'Remote Work', 'Annual Bonus', 'Training & Development'],
    values: ['Innovation', 'Growth Mindset', 'Integrity'],
    jobs: [
      {
        title: 'Business Analyst',
        description: 'Work with clients on strategy, market research, and process improvement.',
        type: 'Full-time',
        experienceRequired: '2+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'Financial Analysis,Excel,Communication,Project Management',
        salary: '$700 - $1,300/month',
      },
    ],
  },
  {
    name: 'Angkor Design Studio',
    email: 'hello@angkordesign-seed.dev',
    phone: '+85523000007',
    industry: 'Design & Creative',
    location: 'Siem Reap',
    companySize: 30,
    foundedYear: 2015,
    description:
      'Award-winning creative studio producing brand identity, digital design, and video production for tourism and hospitality clients in Cambodia.',
    careerScopes: ['Design & Creative', 'Marketing & Advertising'],
    benefits: ['Flexible Hours', 'Remote Work', 'Meal Allowance'],
    values: ['Innovation', 'Excellence', 'Sustainability'],
    jobs: [
      {
        title: 'UI/UX Designer',
        description: 'Design intuitive experiences for our hospitality and tourism clients.',
        type: 'Full-time',
        experienceRequired: '1+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'UI/UX Design,Figma,Photoshop',
        salary: '$500 - $900/month',
      },
      {
        title: 'Graphic Designer',
        description: 'Create visual assets for brand campaigns and social media.',
        type: 'Full-time',
        experienceRequired: '1+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'Photoshop,Figma,Content Writing',
        salary: '$400 - $800/month',
      },
    ],
  },
  {
    name: 'Khmer Health Network',
    email: 'jobs@khmerhealthnet-seed.dev',
    phone: '+85523000008',
    industry: 'Healthcare',
    location: 'Phnom Penh',
    companySize: 150,
    foundedYear: 2012,
    description:
      'Cambodia\'s fastest-growing healthcare network operating clinics and telemedicine services across urban and rural provinces.',
    careerScopes: ['Healthcare', 'Operations & Management', 'Human Resources'],
    benefits: ['Health Insurance', 'Life Insurance', 'Annual Leave (18 days)', 'Training & Development'],
    values: ['Customer First', 'Integrity', 'Teamwork'],
    jobs: [
      {
        title: 'Operations Manager',
        description: 'Oversee daily clinic operations and staff performance.',
        type: 'Full-time',
        experienceRequired: '4+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'Project Management,Communication,Excel',
        salary: '$900 - $1,500/month',
      },
    ],
  },
  {
    name: 'EduCambodia',
    email: 'hiring@educambodia-seed.dev',
    phone: '+85523000009',
    industry: 'Education',
    location: 'Battambang',
    companySize: 120,
    foundedYear: 2014,
    description:
      'EdTech platform delivering vocational training and online courses to Cambodian youth in partnership with NGOs and government agencies.',
    careerScopes: ['Education & Training', 'Marketing & Advertising', 'Software Development'],
    benefits: ['Flexible Hours', 'Remote Work', 'Training & Development', 'Meal Allowance'],
    values: ['Diversity & Inclusion', 'Growth Mindset', 'Sustainability'],
    jobs: [
      {
        title: 'Instructional Designer',
        description: 'Create engaging online learning modules for vocational programs.',
        type: 'Full-time',
        experienceRequired: '2+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'Content Writing,Communication,Project Management',
        salary: '$400 - $700/month',
      },
      {
        title: 'Frontend Developer',
        description: 'Build our e-learning platform and student dashboard.',
        type: 'Full-time',
        experienceRequired: '2+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'React,JavaScript,TypeScript',
        salary: '$600 - $1,100/month',
      },
    ],
  },
  {
    name: 'Phnom Penh SEZ',
    email: 'hr@ppsez-seed.dev',
    phone: '+85523000010',
    industry: 'Manufacturing & Logistics',
    location: 'Phnom Penh',
    companySize: 2000,
    foundedYear: 2006,
    description:
      'Phnom Penh Special Economic Zone is a premier industrial park hosting 100+ international manufacturing companies and logistics operators.',
    careerScopes: ['Operations & Management', 'Human Resources', 'Sales & Business Development'],
    benefits: ['Health Insurance', 'Transportation Allowance', 'Meal Allowance', 'Annual Bonus'],
    values: ['Excellence', 'Teamwork', 'Customer First'],
    jobs: [
      {
        title: 'Supply Chain Coordinator',
        description: 'Coordinate logistics and inventory across our industrial zone operations.',
        type: 'Full-time',
        experienceRequired: '2+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'Excel,Communication,Project Management',
        salary: '$500 - $900/month',
      },
      {
        title: 'HR Generalist',
        description: 'Support recruiting and HR operations for zone tenants.',
        type: 'Full-time',
        experienceRequired: '2+ years',
        educationRequired: "Bachelor's degree",
        skillsRequired: 'Communication,Excel,Customer Service',
        salary: '$450 - $800/month',
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function findOrCreate<T extends object>(
  dataSource: DataSource,
  entity: new () => T,
  where: Partial<T>,
  defaults: Partial<T> = {},
): Promise<T> {
  const repo = dataSource.getRepository(entity);
  const existing = await repo.findOne({ where: where as any });
  if (existing) return existing;
  const created = repo.create({ ...where, ...defaults } as any);
  return repo.save(created as any);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Connecting to database...');

  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('sslmode=require')
      ? { rejectUnauthorized: false }
      : false,
    synchronize: false,
    entities: [
      User, Employee, Company, Social, Chat, JobMatching, Notification,
      CareerScope, Education, Experience, Skill, Benefit, Job, Value,
      Image, ResumeTemplate, CompanyFavoriteEmployee, EmployeeFavoriteCompany,
      Interview,
    ],
  });

  await dataSource.initialize();
  console.log('✅ Connected\n');

  const manager = dataSource.manager;

  // ── 1. Seed shared lookup data ─────────────────────────────────────────────
  console.log('📂 Seeding career scopes...');
  const careerScopeMap = new Map<string, CareerScope>();
  for (const name of CAREER_SCOPES) {
    const cs = await findOrCreate(dataSource, CareerScope, { name } as any);
    careerScopeMap.set(name, cs);
  }
  console.log(`   ✓ ${CAREER_SCOPES.length} career scopes ready`);

  console.log('🛠  Seeding skills...');
  const skillMap = new Map<string, Skill>();
  for (const s of SKILLS_DATA) {
    const skill = await findOrCreate(dataSource, Skill, { name: s.name } as any, { description: s.description } as any);
    skillMap.set(s.name, skill);
  }
  console.log(`   ✓ ${SKILLS_DATA.length} skills ready\n`);

  // ── 2. Seed employees ──────────────────────────────────────────────────────
  console.log('👤 Seeding employees...');
  let employeeCount = 0;

  for (const data of EMPLOYEES_DATA) {
    const existing = await dataSource.getRepository(User).findOne({
      where: { email: data.email },
    });
    if (existing) {
      console.log(`   ⏭  Skipping ${data.email} (already exists)`);
      continue;
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create employee profile
      const employee = queryRunner.manager.create(Employee, {
        firstname: data.firstname,
        lastname: data.lastname,
        username: data.username,
        gender: data.gender,
        dob: data.dob,
        job: data.job,
        yearsOfExperience: data.yearsOfExperience,
        availability: data.availability,
        location: data.location,
        phone: data.phone,
        description: data.description,
      });
      await queryRunner.manager.save(Employee, employee);

      // Education
      const educations = data.educations.map((e) =>
        queryRunner.manager.create(Education, { ...e, employee }),
      );
      await queryRunner.manager.save(Education, educations);

      // Experience
      const experiences = data.experiences.map((e) =>
        queryRunner.manager.create(Experience, { ...e, employee }),
      );
      await queryRunner.manager.save(Experience, experiences);

      // Link skills (already seeded globally)
      const skills = data.skills
        .map((name) => skillMap.get(name))
        .filter(Boolean) as Skill[];
      employee.skills = skills;
      employee.educations = educations;
      employee.experiences = experiences;

      // Link career scopes
      const careerScopes = data.careerScopes
        .map((name) => careerScopeMap.get(name))
        .filter(Boolean) as CareerScope[];
      employee.careerScopes = careerScopes;

      await queryRunner.manager.save(Employee, employee);

      // Create user account — @BeforeInsert() will hash the password
      const user = queryRunner.manager.create(User, {
        role: EUserRole.EMPLOYEE,
        email: data.email,
        phone: data.phone,
        password: 'Password123!',
        employee,
        isEmailVerified: true,
        profileCompleted: true,
      });
      await queryRunner.manager.save(User, user);

      await queryRunner.commitTransaction();
      employeeCount++;
      console.log(`   ✓ ${data.firstname} ${data.lastname} (${data.email})`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error(`   ✗ Failed for ${data.email}: ${(err as Error).message}`);
    } finally {
      await queryRunner.release();
    }
  }

  console.log(`\n   📊 ${employeeCount} employees seeded\n`);

  // ── 3. Seed companies ──────────────────────────────────────────────────────
  console.log('🏢 Seeding companies...');
  let companyCount = 0;

  for (const data of COMPANIES_DATA) {
    const existing = await dataSource.getRepository(User).findOne({
      where: { email: data.email },
    });
    if (existing) {
      console.log(`   ⏭  Skipping ${data.email} (already exists)`);
      continue;
    }

    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create company profile
      const company = queryRunner.manager.create(Company, {
        name: data.name,
        description: data.description,
        phone: data.phone,
        industry: data.industry,
        location: data.location,
        companySize: data.companySize,
        foundedYear: data.foundedYear,
      });
      await queryRunner.manager.save(Company, company);

      // Benefits — find or create
      const benefits: Benefit[] = [];
      for (const label of data.benefits) {
        const b = await findOrCreate(dataSource, Benefit, { label } as any);
        benefits.push(b);
      }

      // Values — find or create
      const values: Value[] = [];
      for (const label of data.values) {
        const v = await findOrCreate(dataSource, Value, { label } as any);
        values.push(v);
      }

      // Career scopes
      const careerScopes = data.careerScopes
        .map((name) => careerScopeMap.get(name))
        .filter(Boolean) as CareerScope[];

      // Jobs
      const jobs = data.jobs.map((j) =>
        queryRunner.manager.create(Job, { ...j, company }),
      );
      await queryRunner.manager.save(Job, jobs);

      company.benefits = benefits;
      company.values = values;
      company.careerScopes = careerScopes;
      company.openPositions = jobs;
      await queryRunner.manager.save(Company, company);

      // Create user account — @BeforeInsert() will hash the password
      const user = queryRunner.manager.create(User, {
        role: EUserRole.COMPANY,
        email: data.email,
        phone: data.phone,
        password: 'Password123!',
        company,
        isEmailVerified: true,
        profileCompleted: true,
      });
      await queryRunner.manager.save(User, user);

      await queryRunner.commitTransaction();
      companyCount++;
      console.log(`   ✓ ${data.name} (${data.email})`);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error(`   ✗ Failed for ${data.email}: ${(err as Error).message}`);
    } finally {
      await queryRunner.release();
    }
  }

  console.log(`\n   📊 ${companyCount} companies seeded\n`);

  await dataSource.destroy();

  console.log('═══════════════════════════════════════════');
  console.log('✅ Seed complete!');
  console.log(`   Employees : ${employeeCount}`);
  console.log(`   Companies : ${companyCount}`);
  console.log('   Password  : Password123!');
  console.log('═══════════════════════════════════════════');
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
