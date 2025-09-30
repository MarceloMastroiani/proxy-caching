import { PartialType } from '@nestjs/mapped-types';
import { CreateProxyServerDto } from './create-proxy-server.dto';

export class UpdateProxyServerDto extends PartialType(CreateProxyServerDto) {}
