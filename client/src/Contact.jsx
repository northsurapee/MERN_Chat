/* eslint-disable react/prop-types */
import Avatar from "./Avatar"

export default function Contact({userId, selected, onClick, username, online}) {
  return (
    <div 
        onClick={() => onClick(userId)} 
        key={userId} 
        className={"border-b border-gray-100 flex items-center gap-2 cursor-pointer " + (selected ? "bg-blue-100" : "")}
    >
        {selected && (
            <div className="w-1 bg-blue-500 h-12 rounded-r-md"></div>
        )}
        <div className="flex items-center gap-2 py-2 pl-4">
            <Avatar online={online} username={username} userId={userId} />
            <span className="text-gray-800">{username}</span>
        </div>
    </div>
  )
}
