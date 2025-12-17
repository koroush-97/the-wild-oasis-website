"use server";

import { signIn, signOut, auth } from "@/app/_lib/auth";
import { supabase } from "./supabase";
import { revalidatePath } from "next/cache";
import { getBookings } from "./data-service";
import { redirect } from "next/navigation";

export async function updateGuest(formData) {
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  const guestBookings = await getBookings(session.user.guestId);
  const guestBookingIds = guestBookings.map((booking) => booking.id);

  if (!guestBookingIds.includes(bookingId))
    throw new Error("You are not allowed to delete this booking");

  const nationalID = formData.get("nationalID");
  const [nationality, countryFlag] = formData.get("nationality").split("%");

  if (!nationalID) throw new Error("National ID is required");

  if (!/^\d{10}$/.test(nationalID))
    throw new Error("Please provide a valid Iranian national ID");

  const updateData = { nationality, countryFlag, nationalID };
  const { data, error } = await supabase
    .from("guests")
    .update(updateData)
    .eq("id", session.user.guestId);

  if (error) throw new Error("Guest could not be updated");

  revalidatePath("/account/profile");
}

export async function deleteReservation(bookingId) {
  await new Promise((res) => setTimeout(res, 2000));

  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  const guestBookings = await getBookings(session.user.guestId);
  const guestBookingIds = guestBookings.map((booking) => booking.id);

  if (!guestBookingIds.includes(bookingId))
    throw new Error("You are not allowed to delete this booking");

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) {
    throw new Error("Booking could not be deleted");
  }

  revalidatePath("/account/reservations");
}

export async function updateBooking(formData) {
  const bookingId = Number(formData.get("bookingId"));

  // 1) Authentication
  const session = await auth();
  if (!session) throw new Error("You must be logged in");
  // 2) Authorization
  const guestBookings = await getBookings(session.user.guestId);
  const guestBookingIds = guestBookings.map((booking) => booking.id);

  if (!guestBookingIds.includes(bookingId))
    throw new Error("You are not allowed to update this booking");
  // 3) Building update data
  const updateData = {
    numGuests: Number(formData.get("numGuests")),
    observations: formData.get("observations").slice(0, 1000),
  };

  //  4) Mutation

  const { error } = await supabase
    .from("bookings")
    .update(updateData)
    .eq("id", bookingId)
    .select()
    .single();

  // 5) Error handling
  if (error) {
    throw new Error("Booking could not be updated");
  }

  // 6) Revalidating
  revalidatePath(`/account/reservations/edit/${bookingId}`);

  // 7) Redirecting
  redirect("/account/reservations");
}

export async function signInAction() {
  await signIn("google", { redirectTo: "/account" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
