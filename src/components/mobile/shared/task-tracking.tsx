'use client';

import { MobileCard } from './mobile-components';
import {
  CheckCircle,
  Circle,
  Clock,
  MapPin,
  Navigation,
  User,
  MessageSquare,
  DollarSign,
  XCircle,
  AlertCircle,
  Loader2,
  Phone
} from 'lucide-react';
import { MaskedCallButton } from '@/components/shared/masked-call-button';
import { maskPhoneNumber } from '@/lib/calling/masked-calling-service';

export type TaskState =
  | 'CREATED'
  | 'MATCHING'
  | 'ASSIGNED'
  | 'RIDER_ACCEPTED'
  | 'PICKED_UP'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export type TaskType = 'BODA_RIDE' | 'CAR_RIDE' | 'FOOD_DELIVERY' | 'SHOPPING' | 'ITEM_DELIVERY';

interface TaskTrackingProps {
  taskNumber: string;
  taskType: TaskType;
  currentState: TaskState;
  pickup: string;
  dropoff: string;
  taskId?: string;
  userId?: string;
  userType?: 'CLIENT' | 'RIDER';
  rider?: {
    id?: string;
    name: string;
    phone: string;
    rating: number;
    vehicleType?: string;
    plateNumber?: string;
  };
  client?: {
    id?: string;
    name: string;
    phone: string;
  };
  fare: number;
  paymentMethod: string;
  estimatedTime?: string;
  cancellationReason?: string;
  onMessage?: () => void;
}

const stateConfig: Record<TaskState, {
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}> = {
  CREATED: {
    label: 'Order Created',
    description: 'Your request has been received',
    icon: <Circle className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  MATCHING: {
    label: 'Finding Rider',
    description: 'Looking for nearby riders...',
    icon: <Loader2 className="h-5 w-5 animate-spin" />,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  ASSIGNED: {
    label: 'Rider Assigned',
    description: 'Waiting for rider confirmation',
    icon: <User className="h-5 w-5" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  RIDER_ACCEPTED: {
    label: 'Rider On The Way',
    description: 'Your rider is heading to pickup',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  PICKED_UP: {
    label: 'Picked Up',
    description: 'Rider has collected the package/passenger',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
  IN_PROGRESS: {
    label: 'In Transit',
    description: 'On the way to destination',
    icon: <Navigation className="h-5 w-5" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  COMPLETED: {
    label: 'Completed',
    description: 'Trip completed successfully',
    icon: <CheckCircle className="h-5 w-5" />,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  CANCELLED: {
    label: 'Cancelled',
    description: 'Trip was cancelled',
    icon: <XCircle className="h-5 w-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  FAILED: {
    label: 'Failed',
    description: 'Trip could not be completed',
    icon: <AlertCircle className="h-5 w-5" />,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
};

const stateOrder: TaskState[] = [
  'CREATED',
  'MATCHING',
  'ASSIGNED',
  'RIDER_ACCEPTED',
  'PICKED_UP',
  'IN_PROGRESS',
  'COMPLETED',
];

export function TaskTracking({
  taskNumber,
  taskType,
  currentState,
  pickup,
  dropoff,
  taskId,
  userId,
  userType,
  rider,
  client,
  fare,
  paymentMethod,
  estimatedTime,
  cancellationReason,
  onMessage,
}: TaskTrackingProps) {
  const currentStateIndex = stateOrder.indexOf(currentState);
  const isTerminalState = ['COMPLETED', 'CANCELLED', 'FAILED'].includes(currentState);

  const getTaskTypeLabel = (type: TaskType) => {
    switch (type) {
      case 'BODA_RIDE': return 'Smart Boda Ride';
      case 'CAR_RIDE': return 'Smart Car Ride';
      case 'FOOD_DELIVERY': return 'Food Delivery';
      case 'SHOPPING': return 'Shopping Delivery';
      case 'ITEM_DELIVERY': return 'Item Delivery';
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Status Header */}
      <MobileCard className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stateConfig[currentState].bgColor}`}>
            <span className={stateConfig[currentState].color}>
              {stateConfig[currentState].icon}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{stateConfig[currentState].label}</h3>
            <p className="text-sm text-gray-500">{stateConfig[currentState].description}</p>
          </div>
        </div>

        {estimatedTime && currentState === 'RIDER_ACCEPTED' && (
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-sm text-gray-500">Arriving in</p>
            <p className="text-2xl font-bold text-emerald-600">{estimatedTime}</p>
          </div>
        )}

        {cancellationReason && (currentState === 'CANCELLED' || currentState === 'FAILED') && (
          <div className="bg-red-50 rounded-xl p-3 mt-2">
            <p className="text-sm text-red-600">Reason: {cancellationReason}</p>
          </div>
        )}
      </MobileCard>

      {/* Progress Steps */}
      {!isTerminalState && (
        <MobileCard className="p-4">
          <h4 className="font-semibold text-gray-900 mb-4">Progress</h4>
          <div className="space-y-0">
            {stateOrder.slice(0, currentStateIndex + 1).map((state, index) => {
              const config = stateConfig[state];
              const isCurrent = state === currentState;
              const isPast = index < currentStateIndex;

              return (
                <div key={state} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isCurrent ? config.bgColor : isPast ? 'bg-emerald-100' : 'bg-gray-100'
                    }`}>
                      {isPast ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <span className={isCurrent ? config.color : 'text-gray-400'}>
                          {isCurrent && state === 'MATCHING' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Circle className={`h-4 w-4 ${isCurrent ? 'fill-current' : ''}`} />
                          )}
                        </span>
                      )}
                    </div>
                    {index < stateOrder.slice(0, currentStateIndex + 1).length - 1 && (
                      <div className={`w-0.5 h-8 ${isPast ? 'bg-emerald-200' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className="pb-8">
                    <p className={`font-medium ${isCurrent ? 'text-gray-900' : 'text-gray-500'}`}>
                      {config.label}
                    </p>
                    <p className="text-sm text-gray-400">{config.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </MobileCard>
      )}

      {/* Route Details */}
      <MobileCard className="p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Route Details</h4>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
              <MapPin className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="font-medium text-gray-900">{pickup}</p>
            </div>
          </div>
          <div className="border-l-2 border-dashed border-gray-200 ml-4 h-4" />
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <Navigation className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Dropoff</p>
              <p className="font-medium text-gray-900">{dropoff}</p>
            </div>
          </div>
        </div>
      </MobileCard>

      {/* Rider Info */}
      {rider && (currentState === 'RIDER_ACCEPTED' || currentState === 'PICKED_UP' || currentState === 'IN_PROGRESS') && (
        <MobileCard className="p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Your Rider</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-gray-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{rider.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">★</span>
                  <span className="text-sm text-gray-600">{rider.rating}</span>
                  {rider.vehicleType && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-600">{rider.vehicleType}</span>
                    </>
                  )}
                  {rider.plateNumber && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm text-gray-600">{rider.plateNumber}</span>
                    </>
                  )}
                </div>
                {rider.phone && (
                  <p className="text-xs text-gray-400 mt-0.5">Phone: {maskPhoneNumber(rider.phone)}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {userId && userType === 'CLIENT' && rider.id && (
                <MaskedCallButton
                  userId={userId}
                  userType="CLIENT"
                  calleeId={rider.id}
                  calleeType="RIDER"
                  calleeDisplayName={rider.plateNumber ? `Rider (${rider.plateNumber})` : rider.name}
                  taskId={taskId}
                  taskType={taskType}
                  size="icon"
                  showLabel={false}
                />
              )}
              <button 
                onClick={onMessage}
                className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"
              >
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </button>
            </div>
          </div>
        </MobileCard>
      )}

      {/* Client Info (for riders) */}
      {client && userType === 'RIDER' && (currentState === 'RIDER_ACCEPTED' || currentState === 'PICKED_UP' || currentState === 'IN_PROGRESS') && (
        <MobileCard className="p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Client</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-gray-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{client.name}</p>
                {client.phone && (
                  <p className="text-xs text-gray-400 mt-0.5">Phone: {maskPhoneNumber(client.phone)}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {userId && client.id && (
                <MaskedCallButton
                  userId={userId}
                  userType="RIDER"
                  calleeId={client.id}
                  calleeType="CLIENT"
                  calleeDisplayName="Client"
                  taskId={taskId}
                  taskType={taskType}
                  size="icon"
                  showLabel={false}
                />
              )}
              <button 
                onClick={onMessage}
                className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center"
              >
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </button>
            </div>
          </div>
        </MobileCard>
      )}

      {/* Fare & Payment */}
      <MobileCard className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Fare</p>
            <p className="text-2xl font-bold text-gray-900">UGX {fare.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">{paymentMethod}</span>
          </div>
        </div>
      </MobileCard>

      {/* Task Number */}
      <p className="text-center text-xs text-gray-400">Task #{taskNumber}</p>
    </div>
  );
}

export default TaskTracking;
