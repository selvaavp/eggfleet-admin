import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Phone, Camera, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  employeeModalFieldInputClass,
  employeeModalFieldLabelClass,
} from '@/components/employees/employee-modal-fields';

const addSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().regex(/^\d{10}$/, 'Must be exactly 10 digits'),
});
export type AddEmployeeProfileForm = z.infer<typeof addSchema>;

export type AddEmployeeProfileCreatePayload = {
  values: AddEmployeeProfileForm;
  photoFile: File | null;
};


type AddEmployeeProfileModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: AddEmployeeProfileCreatePayload) => Promise<void>;
  isCreating?: boolean;
};

export function AddEmployeeProfileModal({
  isOpen,
  onClose,
  onCreate,
  isCreating = false,
}: AddEmployeeProfileModalProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddEmployeeProfileForm>({ resolver: zodResolver(addSchema) });

  useEffect(() => {
    if (!isOpen) return;
    reset({ name: '', phone: '' });
    photoFileRef.current = null;
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, [isOpen, reset]);

  function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5 MB');
      return;
    }
    photoFileRef.current = file;
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add New Employee"
      subtitle="Onboard a new curator to the Organic Precision fleet."
      size="lg"
      className="max-w-[540px] rounded-[28px]"
      bodyClassName="p-0"
      headerClassName="rounded-t-[28px] border-b border-[#E9E8E6] px-6 py-5"
    >
      <form
        onSubmit={handleSubmit(async (values) => {
          await onCreate({ values, photoFile: photoFileRef.current });
        })}
      >
        <div className="space-y-5 px-6 py-5">
          {/* Profile photo upload */}
          <button
            type="button"
            onClick={() => photoInputRef.current?.click()}
            className="flex w-full flex-col items-center rounded-xl border-2 border-dashed border-[#E0E0E0] bg-[#F5F5F4] px-6 py-8 transition hover:border-primary/40 hover:bg-[#FAFAF9]"
          >
            <div className="relative">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-full bg-[#E9E8E6]">
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="size-full object-cover" />
                ) : (
                  <Camera className="size-9 text-[#C2ACA0]" strokeWidth={1.75} aria-hidden />
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full bg-primary text-white ring-2 ring-[#F5F5F4]">
                <Plus className="size-4" strokeWidth={2.5} aria-hidden />
              </span>
            </div>
            <p className="mt-4 text-sm font-bold text-primary">Add Profile Photo</p>
            <p className="mt-1 text-xs font-medium text-[#9CA3AF]">JPG or PNG, max 5MB</p>
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoPick}
          />

          <div>
            <label htmlFor="add-employee-name" className={employeeModalFieldLabelClass}>
              Employee Name
            </label>
            <div className="relative">
              <User
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]"
                strokeWidth={2}
                color='black'
                aria-hidden
              />
              <input
                id="add-employee-name"
                placeholder="e.g. Julian Hatch"
                className={cn(employeeModalFieldInputClass, 'pl-11')}
                {...register('name')}
              />
            </div>
            {errors.name?.message ? (
              <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="add-employee-phone" className={employeeModalFieldLabelClass}>
              Phone Number
            </label>
            <div className="relative">
              <Phone
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#9CA3AF]"
                strokeWidth={2}
                color='black'
                aria-hidden
              />
              <input
                id="add-employee-phone"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile number"
                className={cn(employeeModalFieldInputClass, 'pl-11')}
                {...register('phone')}
              />
            </div>
            {errors.phone?.message ? (
              <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
            ) : null}
          </div>

        </div>

        <div className="flex items-center justify-end gap-5 border-t border-[#E9E8E6] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="text-sm font-bold text-[#57534e] transition hover:text-[#212121] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isCreating}
            className="min-w-[220px] rounded-xl bg-[#F38137] px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(243,129,55,0.4)] transition hover:bg-[#E6742A] disabled:opacity-60"
          >
            {isCreating ? 'Creating…' : 'Create Personnel Profile'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
