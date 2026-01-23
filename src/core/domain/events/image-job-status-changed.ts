import { ImageJobId } from '../value-objects/image-job-id';

export interface ImageJobStatusChangedEventProps {
  aggregateId: ImageJobId;
  previousStatus: string;
  newStatus: string;
  timestamp: Date;
}

export class ImageJobStatusChangedEvent {
  public readonly aggregateId: ImageJobId;
  public readonly previousStatus: string;
  public readonly newStatus: string;
  public readonly timestamp: Date;
  public readonly eventName: string;

  constructor(props: ImageJobStatusChangedEventProps) {
    this.aggregateId = props.aggregateId;
    this.previousStatus = props.previousStatus;
    this.newStatus = props.newStatus;
    this.timestamp = props.timestamp;
    this.eventName = 'ImageJobStatusChanged';
  }
}
