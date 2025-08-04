import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-400 to-purple-600">
      <div className="text-center text-white px-4 space-y-6 max-w-2xl">
        <h1 className="text-4xl font-bold">Welcome to HumanGPT</h1>
        <p className="text-lg">Chat with AI personas that feel completely human. Whether you're looking for a friendly chat, professional advice, or a light-hearted conversation, we have a persona for you!</p>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-6 bg-white text-gray-800 rounded-lg shadow-md">
            <h3 className="text-xl font-bold">WhatsApp Style</h3>
            <p>Experience chat interactions like you're used to on WhatsApp.</p>
          </div>
          <div className="p-6 bg-white text-gray-800 rounded-lg shadow-md">
            <h3 className="text-xl font-bold">Telegram Features</h3>
            <p>Feel the secure and reliable chatting of Telegram.</p>
          </div>
          <div className="p-6 bg-white text-gray-800 rounded-lg shadow-md">
            <h3 className="text-xl font-bold">Discord Vibes</h3>
            <p>Enjoy the community and friend vibes brought by Discord.</p>
          </div>
        </div>

        <Link href="/chat" className="bg-white text-blue-500 px-4 py-2 rounded-full shadow-lg text-lg font-bold hover:bg-gray-100 transition">Start Chatting</Link>
      </div>
    </div>
  );
}
