pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

abstract contract BalanceChecker
{
    function balances(address[] calldata users, address[] calldata tokens) 
        external 
        view 
        virtual
        returns (uint[] memory);
}

contract LPBalanceChecker
{
    function getBalances(
            BalanceChecker bc,
            IERC20 _LPToken,
            IERC20 _tokenToCount,
            address[] calldata _addressesToCount)
        public
        view
        returns (uint[] memory balances)
    {
        // goal:
        // 1. returns the balance of the _tokenToCount that the _addressesToCount hold indirectly via _LPTokens

        // logic:
        // * get the balances of LPtokens for _addressesToCount
        // * get the totalSupply of _LPToken
        // * get the balance of _tokenToCount inside the contract _LPToken
        // * returns the proportional balances * the LPTokenBalances 

        address[] memory LPTokens = new address[](1);
        LPTokens[0] = address(_LPToken);
        balances = bc.balances(_addressesToCount, LPTokens);
        uint totalSupply = _LPToken.totalSupply();
        uint relevantBalanceOfTargetToken = _tokenToCount.balanceOf(address(_LPToken));
        for (uint i=0; i < balances.length; i++)
        {
            balances[i] = relevantBalanceOfTargetToken * balances[i] / totalSupply;
        }
    }    
}