import { Socket } from 'socket.io';
import {
  CallAnswerDTO,
  CallAnswerResponseDTO,
  CallDeclineDTO,
  CallDeclinedResponseDTO,
  CallEndDTO,
  CallEndResponseDTO,
  CallOfferDTO,
  CallOfferResponseDTO,
  IceCandidateDTO,
  IceCandidateResponseDTO,
} from '@app/contracts/dtos/chat';

export interface ICallGateway {
  handleCallOffer(
    client: Socket,
    callOfferDTO: CallOfferDTO,
  ): Promise<CallOfferResponseDTO>;
  handleCallAnswer(
    client: Socket,
    callAnswerDTO: CallAnswerDTO,
  ): Promise<CallAnswerResponseDTO>;
  handleIceCandidate(
    client: Socket,
    iceCandidateDTO: IceCandidateDTO,
  ): Promise<IceCandidateResponseDTO>;
  handleCallDecline(
    client: Socket,
    callDeclineDTO: CallDeclineDTO,
  ): Promise<CallDeclinedResponseDTO>;
  handleCallEnd(
    client: Socket,
    callEndDTO: CallEndDTO,
  ): Promise<CallEndResponseDTO>;
}
