pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract LEVR is ERC20, ERC20Burnable, AccessControl 
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() ERC20("Foundry LEVR Token", "LEVR") 
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function addMinter(address _newMinter) 
        public 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        _grantRole(MINTER_ROLE, _newMinter);
    }

    function mint(address _to, uint256 _amount) 
        public 
        onlyRole(MINTER_ROLE) 
        returns (bool)
    {
        _mint(_to, _amount);
        return true;
    }

    function isMinter(address _account)
        public 
        returns (bool)
    {
        
    }
}