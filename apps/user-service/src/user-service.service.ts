import { User } from '@app/common/database/entities/user.entiry';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UserServiceService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>
  ) {}
}
