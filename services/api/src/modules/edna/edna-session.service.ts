import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import { IntegrationException } from '../../common/errors/integration.exception';

/**
 * Binds edna Pulse tenant to installation after widget provides auth code.
 * TODO: exchange edna_auth_code with real edna OAuth/API when documented.
 */
@Injectable()
export class EdnaSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async bind(installationId: string, ednaAuthCode: string) {
    await this.prisma.installation.findFirstOrThrow({
      where: { id: installationId },
    });
    if (!ednaAuthCode?.trim()) {
      throw new IntegrationException('EDNA_CODE', 'edna_auth_code required');
    }
    const externalId = `edna_${ednaAuthCode.slice(0, 32)}`;
    const tenant = await this.prisma.ednaTenant.upsert({
      where: {
        installationId_ednaTenantExternalId: {
          installationId,
          ednaTenantExternalId: externalId,
        },
      },
      create: {
        installationId,
        ednaTenantExternalId: externalId,
        authState: 'connected',
      },
      update: { authState: 'connected' },
    });
    return { tenant_id: tenant.id, status: 'connected' as const };
  }

  /** Single Pulse logical tenant per installation; API key comes from the widget. */
  async ensurePulseTenant(installationId: string, apiKey: string) {
    await this.prisma.installation.findFirstOrThrow({
      where: { id: installationId, status: 'active' },
    });
    const k = apiKey?.trim();
    if (!k) {
      throw new IntegrationException('EDNA_API_KEY', 'api_key required');
    }
    const externalId = 'edna_pulse';
    return this.prisma.ednaTenant.upsert({
      where: {
        installationId_ednaTenantExternalId: {
          installationId,
          ednaTenantExternalId: externalId,
        },
      },
      create: {
        installationId,
        ednaTenantExternalId: externalId,
        ednaApiKey: k,
        authState: 'connected',
      },
      update: {
        ednaApiKey: k,
        authState: 'connected',
      },
    });
  }
}
