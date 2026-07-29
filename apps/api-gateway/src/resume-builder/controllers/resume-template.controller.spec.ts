import 'reflect-metadata';
import { RESUME_BUILDER_SERVICE } from '@app/contracts/constants/service-actions/resume-builder-service.constant';
import { rpcCall } from '../../utils/rpc-call';
import { ResumeTemplateController } from './resume-template.controller';

jest.mock('../../utils/rpc-call', () => ({ rpcCall: jest.fn() }));

describe('Gateway ResumeTemplateController', () => {
  const client = {};
  const controller = new ResumeTemplateController(client as any);
  beforeEach(() => (rpcCall as jest.Mock).mockResolvedValue({}));

  it('forwards template reads, creation, and search', async () => {
    await controller.findAllResumeTemplate();
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      RESUME_BUILDER_SERVICE.ACTIONS.FIND_ALL_RESUME_TEMPLATES,
      {},
    );
    await controller.findOneResumeTemplateById('template-1');
    const dto = { title: 'Template' } as any;
    const image = { filename: 'image.png' } as any;
    await controller.createResumeTemplate(dto, image);
    expect(rpcCall).toHaveBeenLastCalledWith(
      client,
      RESUME_BUILDER_SERVICE.ACTIONS.CREATE_RESUME_TEMPLATE,
      { dto, image },
    );
    await controller.searchResumeTemplate({ query: 'modern' } as any);
  });
});
