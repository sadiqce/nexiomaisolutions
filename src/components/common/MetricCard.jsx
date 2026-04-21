import React from 'react';

const MetricCard = ({ title, value, unit, color, time }) => {
    let borderColor, unitColor;
    switch (color) {
        case 'green':
            borderColor = 'border-green-300';
            unitColor = 'text-green-600';
            break;
        case 'purple':
            borderColor = 'border-blue-300';
            unitColor = 'text-blue-600';
            break;
        case 'red':
            borderColor = 'border-red-300';
            unitColor = 'text-red-600';
            break;
        default:
            borderColor = 'border-gray-300';
            unitColor = 'text-gray-600';
    }

    return (
        <div className={`px-3 py-2 rounded-lg bg-gray-50 border ${borderColor} shadow-sm hover:shadow-md transition`}>
            <p className={`text-xs ${unitColor} font-semibold mb-0.5 uppercase tracking-wide`}>{title}</p>
            <div className="text-base font-semibold text-gray-900">
                {value}<span className={`text-xs ${unitColor} ml-1`}>{unit}</span>
            </div>
            <p className="text-gray-500 text-xs mt-0.5">{time}</p>
        </div>
    );
};

export default MetricCard;