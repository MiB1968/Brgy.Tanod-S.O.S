export interface RegistrationFormData {
  fullName: string;
  age: string;
  gender: string;
  dob: string;
  civilStatus: string;
  idType: string;
  idNumber: string;
  mobileNumber: string;
  altContactName: string;
  altContactNumber: string;
  email: string;
  houseNumber: string;
  street: string;
  householdCount: string;
  specialNeeds: string;
  specialNeedsInfo: string;
  gpsLat: number;
  gpsLng: number;
  address: string;
  username: string;
  password?: string;
  confirmPassword?: string;
}
