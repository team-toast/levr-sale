pragma solidity 0.8.10;

import "./DSMath.sol";

contract Stake is Owned
{
    struct Deposit
    {
        uint amount;
        uint timestampStart;
        uint timestampEnd;
        uint stake;
    }

    mapping(address => Deposit) deposits;

    uint public totalStake;

    function calculatePeriodScaling(uint _period)
        public
        returns(uint _scaledPeriod)
    {
        _scaledPeriod = pow(period, 1.1);
    }

    function stake(uint _amount, uint _period) 
        public
    {
        // goal:
        // 1. update msg.sender's deposit to reflect their combined stake and lockup period.
        // 2. update totalStake to reflect the total amount of all deposits and lock periods.

        if (deposits[msg.sender].amount != 0)
        {
            uint stake = _amount * calculatePeriodScaling(_period)
            deposits[msg.sender] = Deposit(
                _amount,
                block.timestamp,
                block.timestamp + _period,
                stake
            );
            totalStake += stake; 
        } 
        else
        {
            deposits[msg.sender].amount += _amount;
            deposits[msg.sender].timestampEnd = block.timestamp + _period;
            _period = deposits[msg.sender].timestampEnd - deposits[msg.sender].timestampStart;
            deposits[msg.sender].stake = _amount * calculatePeriodScaling(_period);

        }
    }

    function claim(address _receiver) 
        public
    {
        
    }
}