
import { Link } from "react-router-dom";

// Displayed when a user attempts to access an unauthorized page.
export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          Access Denied
        </h1>

        <p className="mt-3 text-gray-600">
          You do not have permission to access this page.
        </p>

        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-red-700 px-5 py-2.5 font-semibold text-white hover:bg-red-800"
        >
          Return to Dashboard
        </Link>
      </div>
    </main>
  );
}
