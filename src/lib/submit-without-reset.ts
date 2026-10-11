import { startTransition, type FormEvent } from "react";

/**
 * React resets a <form action={…}> after every submission, which would wipe
 * what the user typed when the server returns validation errors. Dispatching
 * from onSubmit keeps the fields intact.
 */
export function submitWithoutReset(dispatch: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  };
}
