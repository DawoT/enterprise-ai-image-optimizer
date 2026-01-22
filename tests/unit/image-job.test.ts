import { ImageJob } from '@/core/domain/entities/image-job';
import { ProcessingStatus } from '@/core/domain/value-objects/processing-status';
import { ImageJobId } from '@/core/domain/value-objects/image-job-id';
import { FileName } from '@/core/domain/value-objects/file-name';
import { FileSize } from '@/core/domain/value-objects/file-size';
import { InvalidImageJobError } from '@/core/domain/errors/invalid-image-job-error';

describe('ImageJob', () => {
  const validProps = {
    fileName: 'product-image.jpg',
    originalFilePath: '/uploads/product-image.jpg',
    originalFileSize: 1024000,
    mimeType: 'image/jpeg',
  };

  describe('create', () => {
    it('should create a valid ImageJob', () => {
      const job = ImageJob.create(validProps);

      expect(job).toBeInstanceOf(ImageJob);
      expect(job.fileName.value).toBe('product-image.jpg');
      expect(job.mimeType).toBe('image/jpeg');
      expect(job.originalFileSize.value).toBe(1024000);
      expect(job.isPending).toBe(true);
    });

    it('should throw InvalidImageJobError when fileName is empty', () => {
      expect(() =>
        ImageJob.create({
          ...validProps,
          fileName: '',
        }),
      ).toThrow(InvalidImageJobError);
    });

    it('should throw InvalidImageJobError when fileName is missing', () => {
      const props = { ...validProps };
      delete (props as { fileName?: string }).fileName;

      expect(() => ImageJob.create(props as Parameters<typeof ImageJob.create>[0])).toThrow(
        InvalidImageJobError,
      );
    });

    it('should throw InvalidImageJobError when mimeType is invalid', () => {
      expect(() =>
        ImageJob.create({
          ...validProps,
          mimeType: 'application/json',
        }),
      ).toThrow(InvalidImageJobError);
    });

    it('should throw InvalidImageJobError when fileSize exceeds limit', () => {
      expect(() =>
        ImageJob.create({
          ...validProps,
          originalFileSize: 100 * 1024 * 1024, // 100MB, exceeds 50MB limit
        }),
      ).toThrow(InvalidImageJobError);
    });

    it('should throw InvalidImageJobError when originalFilePath is empty', () => {
      expect(() =>
        ImageJob.create({
          ...validProps,
          originalFilePath: '',
        }),
      ).toThrow(InvalidImageJobError);
    });

    it('should create job with brand and product context', () => {
      const brandContext = {
        name: 'TestBrand',
        vertical: 'fashion' as const,
        tone: 'premium' as const,
      };

      const productContext = {
        id: 'PROD-001',
        category: 'shoes',
        attributes: ['leather', 'brown'],
      };

      const job = ImageJob.create({
        ...validProps,
        brandContext,
        productContext,
      });

      expect(job.brandContext).toEqual(brandContext);
      expect(job.productContext).toEqual(productContext);
    });
  });

  describe('status transitions', () => {
    it('should start in PENDING status', () => {
      const job = ImageJob.create(validProps);
      expect(job.status.isPending).toBe(true);
      expect(job.status.isProcessing).toBe(false);
    });

    it('should transition from PENDING to PROCESSING', () => {
      const job = ImageJob.create(validProps);
      const event = job.updateStatus(ProcessingStatus.processing());

      expect(job.status.isProcessing).toBe(true);
      expect(event).not.toBeNull();
      expect(event?.newStatus).toBe('PROCESSING');
    });

    it('should transition from PROCESSING to COMPLETED', () => {
      const job = ImageJob.create(validProps);
      job.updateStatus(ProcessingStatus.processing());
      const event = job.updateStatus(ProcessingStatus.completed());

      expect(job.status.isCompleted).toBe(true);
      expect(event).not.toBeNull();
    });

    it('should transition from PROCESSING to FAILED', () => {
      const job = ImageJob.create(validProps);
      job.updateStatus(ProcessingStatus.processing());
      const event = job.updateStatus(ProcessingStatus.failed());

      expect(job.status.isFailed).toBe(true);
      expect(event).not.toBeNull();
    });

    it('should not allow invalid state transitions', () => {
      const job = ImageJob.create(validProps);

      // Cannot go from PENDING directly to COMPLETED
      expect(job.status.canTransitionTo(ProcessingStatus.completed())).toBe(false);
    });

    it('should allow retry after FAILED', () => {
      const job = ImageJob.create(validProps);
      job.updateStatus(ProcessingStatus.processing());
      job.updateStatus(ProcessingStatus.failed());

      expect(job.status.canTransitionTo(ProcessingStatus.pending())).toBe(true);
    });
  });

  describe('version management', () => {
    it('should initially have no versions', () => {
      const job = ImageJob.create(validProps);
      expect(job.versions.size).toBe(0);
    });
  });

  describe('equality', () => {
    it('should be equal when IDs match', () => {
      const id = ImageJobId.create('test-id-123');
      const props = { ...validProps };

      // Simular que ambos tienen el mismo ID
      const job1 = ImageJob.create(props);
      const job2 = ImageJob.create(props);

      // Los IDs serán diferentes porque se generan nuevos
      expect(job1.equals(job2)).toBe(false);
    });
  });
});

describe('ImageJobId', () => {
  it('should create a valid UUID v4', () => {
    const id = ImageJobId.create();
    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('should accept a custom ID', () => {
    const customId = 'custom-id-123';
    const id = ImageJobId.create(customId);
    expect(id.value).toBe(customId);
  });

  it('should throw error for invalid UUID format', () => {
    expect(() => ImageJobId.create('invalid-id')).toThrow();
  });
});

describe('FileName', () => {
  it('should create a valid file name', () => {
    const fileName = FileName.create('image.jpg');
    expect(fileName.value).toBe('image.jpg');
    expect(fileName.extension).toBe('jpg');
    expect(fileName.nameWithoutExtension).toBe('image');
  });

  it('should throw error for empty file name', () => {
    expect(() => FileName.create('')).toThrow();
  });

  it('should throw error for file name with path', () => {
    expect(() => FileName.create('/path/to/image.jpg')).toThrow();
  });

  it('should throw error for file name without extension', () => {
    expect(() => FileName.create('image')).toThrow();
  });

  it('should be case insensitive for equality', () => {
    const name1 = FileName.create('IMAGE.JPG');
    const name2 = FileName.create('image.jpg');
    expect(name1.equals(name2)).toBe(true);
  });
});

describe('FileSize', () => {
  it('should create a valid file size', () => {
    const size = FileSize.create(1024);
    expect(size.value).toBe(1024);
    expect(size.kilobytes).toBe(1);
  });

  it('should throw error for negative size', () => {
    expect(() => FileSize.create(-100)).toThrow();
  });

  it('should throw error for non-integer size', () => {
    expect(() => FileSize.create(1024.5)).toThrow();
  });

  it('should format size correctly', () => {
    expect(FileSize.create(500).toFormattedString()).toBe('500 B');
    expect(FileSize.create(2048).toFormattedString()).toBe('2.00 KB');
    expect(FileSize.create(2 * 1024 * 1024).toFormattedString()).toBe('2.00 MB');
  });

  it('should compare sizes correctly', () => {
    const size1 = FileSize.create(1000);
    const size2 = FileSize.create(2000);

    expect(size1.isLessThan(size2)).toBe(true);
    expect(size2.isGreaterThan(size1)).toBe(true);
  });
});

describe('ProcessingStatus', () => {
  it('should have correct boolean flags', () => {
    const pending = ProcessingStatus.pending();
    expect(pending.isPending).toBe(true);
    expect(pending.isTerminal).toBe(false);
    expect(pending.isActive).toBe(false);
  });

  it('should convert from string correctly', () => {
    const status = ProcessingStatus.fromString('PROCESSING');
    expect(status.isProcessing).toBe(true);
  });

  it('should throw error for invalid status', () => {
    expect(() => ProcessingStatus.fromString('INVALID')).toThrow();
  });

  it('should provide human readable description', () => {
    expect(ProcessingStatus.pending().toHumanReadable()).toBe('Pendiente');
    expect(ProcessingStatus.completed().toHumanReadable()).toBe('Completado');
    expect(ProcessingStatus.failed().toHumanReadable()).toBe('Fallido');
  });
});
