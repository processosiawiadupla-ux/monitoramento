import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'API ferramenta de monitoramento funcionnado';
  }
}
