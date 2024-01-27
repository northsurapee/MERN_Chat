/* eslint-disable react/prop-types */
export default function Avatar({username, userId}) {
    const colors = ["bg-red-200", "bg-green-200", "bg-purple-200", 
                    "bg-blue-200", "bg-yellow-200", "bg-teal-200",
                    "bg-orange-200", "bg-pink-200", "bg-gray-200"];
    const userIdBase10 = parseInt(userId, 16);
    const colorIndex = userIdBase10 % colors.length;
    const color = colors[colorIndex];

    return (
        <div className={"w-8 h-8 rounded-full flex items-center justify-center " + color}>
            <div className="opacity-60">
                {username[0]}
            </div>
        </div>
    );
}
