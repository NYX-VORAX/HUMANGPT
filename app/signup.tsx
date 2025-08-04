import Link from 'next/link';

export default function SignUp() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex justify-center items-center">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8">
        <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Create Your Account</h2>
        <form className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input 
              type="text" 
              className="form-input mt-1" 
              placeholder="John Doe" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email address</label>
            <input 
              type="email" 
              className="form-input mt-1" 
              placeholder="you@example.com" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input 
              type="password" 
              className="form-input mt-1" 
              placeholder="Enter your password" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <input 
              type="password" 
              className="form-input mt-1" 
              placeholder="Confirm your password" 
              required 
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all duration-300"
          >
            Sign Up
          </button>
          <p className="text-center text-sm text-gray-600">
            Already have an account? <Link href="/login" className="text-purple-500 hover:underline">Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
