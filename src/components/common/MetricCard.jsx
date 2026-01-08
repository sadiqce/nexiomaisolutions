import React from 'react';

const MetricCard = ({ title, value, unit, color, time }) => {
    let borderColor, unitColor;
    switch (color) {
        case 'green':
            borderColor = 'border-green-500';
            unitColor = 'text-green-400';
            break;
        case 'purple':
            borderColor = 'border-purple-500';
            unitColor = 'text-purple-400';
            break;
        case 'red':
            borderColor = 'border-red-500';
            unitColor = 'text-red-400';
            break;
        default:
            borderColor = 'border-gray-500';
            unitColor = 'text-gray-400';
    }

    return (
        <div className={`p-6 rounded-xl bg-gray-800 border ${borderColor} shadow-lg`}>
            <p className={`text-sm ${unitColor} font-medium mb-2`}>{title}</p>
            <div className="text-5xl font-extrabold text-white">
                {value}<span className={`text-3xl ${unitColor}`}>{unit}</span>
            </div>
            <p className="text-gray-500 mt-1">{time}</p>
        </div>
    );
};

export default MetricCard;