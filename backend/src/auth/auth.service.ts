


// backend/src/auth/auth.service.ts
import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { SignupDto, LoginDto } from '../user/dto/auth.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    try {
      const { username, email, password } = signupDto;

      console.log('Signup attempt for:', { username, email });

      // Check if user already exists
      const existingUserByUsername = await this.userService.findByUsername(username);
      if (existingUserByUsername) {
        console.log('Username already exists:', username);
        throw new ConflictException('Username already exists');
      }

      const existingUserByEmail = await this.userService.findByEmail(email);
      if (existingUserByEmail) {
        console.log('Email already exists:', email);
        throw new ConflictException('Email already exists');
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      console.log('Password hashed successfully');

      // Create user
      const user = await this.userService.create({
        username,
        email,
        password: hashedPassword,
      });
      console.log('User created successfully:', user._id);

      // Generate JWT token
      const payload = { sub: user._id, username: user.username, email: user.email };
      const token = this.jwtService.sign(payload);
      console.log('JWT token generated successfully');

      return {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
        },
        token,
      };
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    const { usernameOrEmail, password } = loginDto;

    // Find user by username or email
    let user;
    if (usernameOrEmail.includes('@')) {
      user = await this.userService.findByEmail(usernameOrEmail);
    } else {
      user = await this.userService.findByUsername(usernameOrEmail);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const payload = { sub: user._id, username: user.username, email: user.email };
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
      token,
    };
  }

  async validateUser(payload: any) {
    return await this.userService.findById(payload.sub);
  }
}